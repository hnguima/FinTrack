import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Paper,
  Box,
  Alert,
  Snackbar,
  Typography,
  TextField,
  Switch,
  Select,
  MenuItem,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";
import { Capacitor } from "@capacitor/core";
import { ApiClient } from "../utils/apiClient";
import { BackgroundSync } from "../utils/backgroundSync";
import { UserCacheManager } from "../utils/userCacheManager";
import { saveUserUpdatedAt } from "../capacitorPreferences";
import ProfilePhoto from "../components/ProfilePhoto";

interface UserProfileScreenProps {
  themeMode: "light" | "dark";
  setThemeMode: (mode: "light" | "dark") => void;
  language: string;
  setLanguage: (lang: string) => void;
  user: {
    username: string;
    email: string;
    name: string;
    provider: string;
    photo?: string;
    preferences?: {
      theme: "light" | "dark";
      language: string;
    };
  };
  onUserUpdate: (updatedUser: any) => void;
}

const Pane = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  margin: theme.spacing(2, 0),
  borderRadius: theme.shape.borderRadius,
}));

const UserProfileScreen: React.FC<UserProfileScreenProps> = ({
  themeMode,
  setThemeMode,
  language,
  setLanguage,
  user,
  onUserUpdate,
}) => {
  const { t } = useTranslation();
  const [editName, setEditName] = useState(user.name);
  const [isLoading, setIsLoading] = useState(false);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error";
  }>({
    open: false,
    message: "",
    severity: "success",
  });

  const handlePhotoUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    await handlePhotoUploadFile(file);
  };

  const handlePhotoUploadFile = async (file: File) => {
    // Check file size (limit to 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setSnackbar({
        open: true,
        message: "Photo must be smaller than 5MB",
        severity: "error",
      });
      return;
    }

    setPhotoLoading(true);
    try {
      // Create optimistic update - cache the photo immediately
      const tempUrl = URL.createObjectURL(file);
      const optimisticUser = { ...user, photo: tempUrl };
      onUserUpdate(optimisticUser);
      await UserCacheManager.updateCachedPhoto(tempUrl);

      const response = await ApiClient.uploadProfilePhoto(file);

      if (response.status === 200) {
        // Instead of fetching fresh profile (which loses unsaved changes),
        // merge current user state with the new photo URL from upload response
        const uploadResponseData = response.data;
        
        // Create updated user data by preserving local changes and adding new photo
        const updatedUserWithPhoto = { 
          ...user, // Start with current user (preserves unsaved changes like theme)
          ...uploadResponseData, // Add server fields (id, created_at, etc.)
          ...user, // Re-apply user data to override any server preferences with local ones
          photo: uploadResponseData.photo || uploadResponseData.photoUrl, // Use new photo from server
          updated_at: uploadResponseData.updated_at || uploadResponseData.created_at
        };

        // Update cache with the merged data
        const serverTimestamp = updatedUserWithPhoto.updated_at;
        await UserCacheManager.cacheUserData(updatedUserWithPhoto, serverTimestamp);
        await saveUserUpdatedAt(serverTimestamp);

        // Also ensure the photo BLOB is cached with the correct timestamp
        const newPhotoUrl = updatedUserWithPhoto.photo;
        if (newPhotoUrl && !newPhotoUrl.startsWith('blob:')) {
          // If it's a server URL, cache it as BLOB
          await UserCacheManager.fetchAndCachePhotoBlob(newPhotoUrl, serverTimestamp);
        }

        // Get cached photo BLOB to replace server URL with BLOB
        const cachedPhotoUrl = await UserCacheManager.getCachedPhotoDataUrl();
        const finalUserData = {
          ...updatedUserWithPhoto,
          photo: cachedPhotoUrl || updatedUserWithPhoto.photo
        };
        
        // Use the final data with BLOB photo
        onUserUpdate(finalUserData);

        // Clean up temporary URL
        URL.revokeObjectURL(tempUrl);

        // Sync any pending changes (like theme) that might have been queued
        // while we were uploading the photo
        await BackgroundSync.syncIfPending();
      } else {
        throw new Error(response.data.message || "Failed to upload photo");
      }
    } catch (error) {
      console.error("Photo upload error:", error);

      // Revert optimistic update on error
      const cachedData = await UserCacheManager.getUserDataWithCache();
      if (cachedData) {
        onUserUpdate(cachedData);
      }

      setSnackbar({
        open: true,
        message:
          error instanceof Error ? error.message : "Failed to upload photo",
        severity: "error",
      });
    } finally {
      setPhotoLoading(false);
    }
  };

  const handleCameraCapture = async () => {
    if (!Capacitor.isNativePlatform()) {
      setSnackbar({
        open: true,
        message: "Camera is only available on mobile devices",
        severity: "error",
      });
      return;
    }

    setPhotoLoading(true);
    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
        width: 800,
        height: 800,
        correctOrientation: true,
      });

      if (image.dataUrl) {
        const response = await fetch(image.dataUrl);
        const blob = await response.blob();
        const file = new File([blob], "camera_photo.jpg", {
          type: "image/jpeg",
        });

        await handlePhotoUploadFile(file);
      }
    } catch (error) {
      console.error("Camera capture error:", error);
      let errorMessage = "Failed to capture photo";

      if (error instanceof Error) {
        if (error.message.includes("User cancelled")) {
          errorMessage = "Photo capture cancelled";
        } else if (error.message.includes("permission")) {
          errorMessage =
            "Camera permission denied. Please enable camera access in settings.";
        } else {
          errorMessage = error.message;
        }
      }

      setSnackbar({
        open: true,
        message: errorMessage,
        severity: "error",
      });
      setPhotoLoading(false);
    }
  };

  const handlePhotosSelect = async () => {
    if (!Capacitor.isNativePlatform()) {
      // Fallback to file input for web
      handleGallerySelect();
      return;
    }

    setPhotoLoading(true);
    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Photos,
        width: 800,
        height: 800,
        correctOrientation: true,
      });

      if (image.dataUrl) {
        const response = await fetch(image.dataUrl);
        const blob = await response.blob();
        const file = new File([blob], "selected_photo.jpg", {
          type: "image/jpeg",
        });

        await handlePhotoUploadFile(file);
      }
    } catch (error) {
      console.error("Photo selection error:", error);
      setSnackbar({
        open: true,
        message: "Failed to select photo from gallery",
        severity: "error",
      });
    } finally {
      setPhotoLoading(false);
    }
  };

  const handleGallerySelect = () => {
    // Trigger file input click
    document.getElementById("photo-file-input")?.click();
  };

  const updateProfile = async (updates: any) => {
    setIsLoading(true);
    try {
      // Merge updates with current user data
      const updatedUser = { ...user, ...updates };
      
      // Update local state immediately for responsiveness
      onUserUpdate(updatedUser);
      
      // Note: BackgroundSync queuing is handled by App.tsx handleUserUpdate()
      // so we don't queue here to avoid duplicates
      
      // Update local storage with updated data
      localStorage.setItem("user", JSON.stringify(updatedUser));
    } catch (error) {
      console.error("Error queuing profile update:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNameUpdate = async () => {
    if (editName !== user.name) {
      await updateProfile({ name: editName });
    }
  };

  const handleThemeChange = async (newTheme: "light" | "dark") => {
    setThemeMode(newTheme); // Update App-level theme immediately
    const preferences = { ...user.preferences, theme: newTheme };
    await updateProfile({ preferences });
  };

  const handleLanguageChange = async (newLanguage: string) => {
    setLanguage(newLanguage); // Update App-level language immediately
    const preferences = { ...user.preferences, language: newLanguage };
    await updateProfile({ preferences });
  };

  return (
    <Box
      sx={{
        padding: 3,
        maxWidth: 600,
        margin: "0 auto",
      }}
    >
      {/* User Info Section */}
      <Pane>
        <Typography variant="h6" gutterBottom>
          {t("personalInfo")}
        </Typography>

        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            mb: 3,
          }}
        >
          <ProfilePhoto
            user={user}
            size={100}
            showEditButton={true}
            isLoading={photoLoading}
            onPhotoCapture={handleCameraCapture}
            onPhotoSelect={handlePhotosSelect}
          />

          {/* Hidden file input for gallery selection */}
          <input
            id="photo-file-input"
            type="file"
            accept="image/*"
            onChange={handlePhotoUpload}
            style={{ display: "none" }}
          />
        </Box>

        <Box sx={{ mb: 2 }}>
          <TextField
            label={t("name")}
            fullWidth
            value={editName}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setEditName(e.target.value)
            }
            onBlur={handleNameUpdate}
            disabled={isLoading}
            sx={{ mb: 2 }}
          />

          <TextField
            label={t("email")}
            fullWidth
            value={user.email}
            disabled
            // helperText={t("emailCannotBeChanged")}
            sx={{ mb: 2 }}
          />
        </Box>
      </Pane>

      {/* Theme Settings */}
      <Pane>
        <Typography variant="h6" gutterBottom>
          {t("theme")}
        </Typography>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 2,
          }}
        >
          <Typography>
            {t("theme")}: {themeMode === "dark" ? t("dark") : t("light")}
          </Typography>
          <Switch
            checked={themeMode === "dark"}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              handleThemeChange(e.target.checked ? "dark" : "light")
            }
            color="primary"
            disabled={isLoading}
            slotProps={{ input: { "aria-label": "toggle dark mode" } }}
          />
        </Box>
      </Pane>

      {/* Language Settings */}
      <Pane>
        <Typography variant="h6" gutterBottom>
          {t("language")}
        </Typography>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 2,
          }}
        >
          <Typography>{t("language")}</Typography>
          <Select
            value={language}
            onChange={(e: any) => handleLanguageChange(e.target.value)}
            size="small"
            sx={{ minWidth: 120 }}
            disabled={isLoading}
          >
            <MenuItem value="en">{t("en")}</MenuItem>
            <MenuItem value="pt">{t("pt")}</MenuItem>
            <MenuItem value="es">{t("es")}</MenuItem>
            <MenuItem value="fr">{t("fr")}</MenuItem>
            <MenuItem value="de">{t("de")}</MenuItem>
            {/* Add more languages as needed */}
          </Select>
        </Box>
      </Pane>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default UserProfileScreen;
