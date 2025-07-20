import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Switch,
  Typography,
  Paper,
  Box,
  Select,
  MenuItem,
  TextField,
  Avatar,
  IconButton,
  Alert,
  Snackbar,
  Menu,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import PhotoLibraryIcon from "@mui/icons-material/PhotoLibrary";
import PersonIcon from "@mui/icons-material/Person";
import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";
import { Capacitor } from "@capacitor/core";
import { ApiClient } from "../utils/apiClient";

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
  marginBottom: theme.spacing(3),
  borderRadius: Number(theme.shape.borderRadius) * 2,
  boxShadow: theme.shadows[2],
}));

const PhotoUploadContainer = styled(Box)(({ theme }) => ({
  position: "relative",
  display: "inline-block",
  marginBottom: theme.spacing(2),
}));

// const SafeArea = styled("div")({
//   height: "env(safe-area-inset-top, 0px)",
// });

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
  const [photoMenuAnchor, setPhotoMenuAnchor] = useState<null | HTMLElement>(
    null
  );
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success" as "success" | "error",
  });

  const handlePhotoUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file size (limit to 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setSnackbar({
        open: true,
        message: "Photo must be smaller than 5MB",
        severity: "error",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await ApiClient.uploadProfilePhoto(file);

      if (response.status === 200) {
        // Refresh user profile to get updated photo
        const profileResponse = await ApiClient.getUserProfile();
        if (profileResponse.status === 200) {
          onUserUpdate(profileResponse.data);
          setSnackbar({
            open: true,
            message: "Photo uploaded successfully!",
            severity: "success",
          });
        }
      } else {
        throw new Error(response.data.message || "Failed to upload photo");
      }
    } catch (error) {
      console.error("Photo upload error:", error);
      setSnackbar({
        open: true,
        message:
          error instanceof Error ? error.message : "Failed to upload photo",
        severity: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCameraCapture = async () => {
    setPhotoMenuAnchor(null);

    if (!Capacitor.isNativePlatform()) {
      setSnackbar({
        open: true,
        message: "Camera is only available on mobile devices",
        severity: "error",
      });
      return;
    }

    setIsLoading(true);
    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false, // Disable editing to avoid external app prompts
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
        width: 800, // Limit photo size for better performance
        height: 800,
        correctOrientation: true, // Auto-rotate based on device orientation
      });

      if (image.dataUrl) {
        // Convert data URL to File object
        const response = await fetch(image.dataUrl);
        const blob = await response.blob();
        const file = new File([blob], "camera_photo.jpg", {
          type: "image/jpeg",
        });

        const uploadResponse = await ApiClient.uploadProfilePhoto(file);

        if (uploadResponse.status === 200) {
          // Refresh user profile to get updated photo
          const profileResponse = await ApiClient.getUserProfile();
          if (profileResponse.status === 200) {
            onUserUpdate(profileResponse.data);
            setSnackbar({
              open: true,
              message: "Photo captured and uploaded successfully!",
              severity: "success",
            });
          }
        } else {
          throw new Error("Failed to upload photo");
        }
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
    } finally {
      setIsLoading(false);
    }
  };

  const handlePhotosSelect = async () => {
    setPhotoMenuAnchor(null);

    if (!Capacitor.isNativePlatform()) {
      // Fallback to file input for web
      handleGallerySelect();
      return;
    }

    setIsLoading(true);
    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Photos, // This gives access to camera + gallery picker
        width: 800,
        height: 800,
        correctOrientation: true,
      });

      if (image.dataUrl) {
        // Convert data URL to File object
        const response = await fetch(image.dataUrl);
        const blob = await response.blob();
        const file = new File([blob], "selected_photo.jpg", {
          type: "image/jpeg",
        });

        const uploadResponse = await ApiClient.uploadProfilePhoto(file);

        if (uploadResponse.status === 200) {
          // Refresh user profile to get updated photo
          const profileResponse = await ApiClient.getUserProfile();
          if (profileResponse.status === 200) {
            onUserUpdate(profileResponse.data);
            setSnackbar({
              open: true,
              message: "Photo selected and uploaded successfully!",
              severity: "success",
            });
          }
        } else {
          throw new Error("Failed to upload photo");
        }
      }
    } catch (error) {
      console.error("Photo selection error:", error);
      let errorMessage = "Failed to select photo";

      if (error instanceof Error) {
        if (error.message.includes("User cancelled")) {
          errorMessage = "Photo selection cancelled";
        } else {
          errorMessage = error.message;
        }
      }

      setSnackbar({
        open: true,
        message: errorMessage,
        severity: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGallerySelect = () => {
    setPhotoMenuAnchor(null);
    // Trigger file input click
    document.getElementById("photo-file-input")?.click();
  };

  const handlePhotoMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setPhotoMenuAnchor(event.currentTarget);
  };

  const handlePhotoMenuClose = () => {
    setPhotoMenuAnchor(null);
  };

  const updateProfile = async (updates: any) => {
    setIsLoading(true);
    try {
      const response = await ApiClient.updateUserProfile(updates);

      if (response.status === 200) {
        const updatedUser = response.data;
        onUserUpdate(updatedUser);
        setSnackbar({
          open: true,
          message: "Profile updated successfully!",
          severity: "success",
        });

        // Update local storage
        localStorage.setItem("user", JSON.stringify(updatedUser));
      } else {
        throw new Error(response.data.message || "Failed to update profile");
      }
    } catch (error) {
      console.error("Profile update error:", error);
      setSnackbar({
        open: true,
        message:
          error instanceof Error ? error.message : "Failed to update profile",
        severity: "error",
      });
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
    setThemeMode(newTheme);
    const preferences = { ...user.preferences, theme: newTheme };
    await updateProfile({ preferences });
  };

  const handleLanguageChange = async (newLanguage: string) => {
    setLanguage(newLanguage);
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
          <PhotoUploadContainer>
            <Avatar
              src={user.photo}
              alt={user.name}
              sx={{ width: 100, height: 100 }}
            >
              {!user.photo && <PersonIcon sx={{ fontSize: 60 }} />}
            </Avatar>
            <IconButton
              sx={{
                position: "absolute",
                bottom: 0,
                right: 0,
                backgroundColor: (theme) => theme.palette.primary.main,
                color: (theme) => theme.palette.primary.contrastText,
                "&:hover": {
                  backgroundColor: (theme) => theme.palette.primary.dark,
                },
                width: 32,
                height: 32,
              }}
              onClick={handlePhotoMenuClick}
            >
              <PhotoCameraIcon sx={{ fontSize: 16 }} />
            </IconButton>

            {/* Hidden file input for gallery selection */}
            <input
              id="photo-file-input"
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              style={{ display: "none" }}
            />
          </PhotoUploadContainer>

          {/* Photo source selection menu */}
          <Menu
            anchorEl={photoMenuAnchor}
            open={Boolean(photoMenuAnchor)}
            onClose={handlePhotoMenuClose}
            anchorOrigin={{
              vertical: "bottom",
              horizontal: "center",
            }}
            transformOrigin={{
              vertical: "top",
              horizontal: "center",
            }}
          >
            {Capacitor.isNativePlatform() ? (
              // Mobile options
              <>
                <MenuItem onClick={handleCameraCapture}>
                  <ListItemIcon>
                    <PhotoCameraIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText>{t("takePhoto", "Take Photo")}</ListItemText>
                </MenuItem>
                <MenuItem onClick={handlePhotosSelect}>
                  <ListItemIcon>
                    <PhotoLibraryIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText>
                    {t("selectFromPhotos", "Select from Photos")}
                  </ListItemText>
                </MenuItem>
              </>
            ) : (
              // Web option
              <MenuItem onClick={handleGallerySelect}>
                <ListItemIcon>
                  <PhotoLibraryIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>
                  {t("chooseFromGallery", "Choose from Gallery")}
                </ListItemText>
              </MenuItem>
            )}
          </Menu>

          <Typography variant="body2" color="text.secondary">
            {t("clickToChangePhoto")}
          </Typography>
        </Box>

        <Box sx={{ mb: 2 }}>
          <TextField
            label={t("name")}
            fullWidth
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
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
            onChange={(e) =>
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
            onChange={(e) => handleLanguageChange(e.target.value)}
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
