import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Avatar,
  CircularProgress,
  Box,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import PhotoLibraryIcon from "@mui/icons-material/PhotoLibrary";
import PersonIcon from "@mui/icons-material/Person";
import { Capacitor } from "@capacitor/core";
import { UserCacheManager } from "../utils/userCacheManager";

const PhotoContainer = styled(Box)(() => ({
  position: "relative",
  display: "inline-block",
}));

const LoadingOverlay = styled(Box)(() => ({
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: "rgba(0, 0, 0, 0.5)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "50%",
  zIndex: 1,
}));

const PhotoIconButton = styled(IconButton)(({ theme }) => ({
  position: "absolute",
  bottom: 0,
  right: 0,
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.primary.contrastText,
  width: 32,
  height: 32,
  "&:hover": {
    backgroundColor: theme.palette.primary.dark,
  },
}));

interface ProfilePhotoProps {
  user: {
    photo?: string;
  };
  size?: number;
  showEditButton?: boolean;
  isLoading?: boolean;
  onPhotoCapture?: () => void;
  onPhotoSelect?: () => void;
}

const ProfilePhoto: React.FC<ProfilePhotoProps> = ({
  user,
  size = 80,
  showEditButton = false,
  isLoading: externalLoading = false,
  onPhotoCapture,
  onPhotoSelect,
}) => {
  const { t } = useTranslation();
  const [cachedPhotoUrl, setCachedPhotoUrl] = useState<string | null>(null);
  const [internalLoading, setInternalLoading] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);

  const isLoading = externalLoading || internalLoading;

  // Load cached photo on component mount
  useEffect(() => {
    const loadCachedPhoto = async () => {
      try {
        const cachedPhoto = await UserCacheManager.getCachedPhotoDataUrl();
        if (cachedPhoto) {
          setCachedPhotoUrl(cachedPhoto);
        }
      } catch (error) {
        console.error("Error loading cached photo:", error);
      }
    };

    loadCachedPhoto();
  }, []);

  // Update cached photo URL when user.photo changes (but don't trigger server fetch)
  useEffect(() => {
    const updateCachedUrl = async () => {
      if (user.photo) {
        // First try to get cached photo BLOB
        const cachedPhoto = await UserCacheManager.getCachedPhotoDataUrl();
        if (cachedPhoto) {
          setCachedPhotoUrl(cachedPhoto);
        } else {
          // No cached BLOB available, use the server URL
          setCachedPhotoUrl(user.photo);
        }
      }
    };

    updateCachedUrl();
  }, [user.photo]); // Removed cachedPhotoUrl dependency to avoid loops

  // Reset internal loading when external loading changes
  useEffect(() => {
    if (!externalLoading) {
      setInternalLoading(false);
    }
  }, [externalLoading]);

  // Determine which photo URL to use
  const displayPhotoUrl = user.photo || cachedPhotoUrl;

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setMenuAnchor(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
  };

  const handleCameraCapture = () => {
    handleMenuClose();
    if (onPhotoCapture) {
      setInternalLoading(true);
      // Note: The parent component should call setInternalLoading(false) when done
      onPhotoCapture();
    }
  };

  const handlePhotoSelect = () => {
    handleMenuClose();
    if (onPhotoSelect) {
      setInternalLoading(true);
      // Note: The parent component should call setInternalLoading(false) when done
      onPhotoSelect();
    }
  };

  return (
    <PhotoContainer>
      <Avatar
        src={displayPhotoUrl || undefined}
        sx={{
          width: size,
          height: size,
          fontSize: size * 0.4,
          border: (theme) => `2px solid ${theme.palette.primary.main}`,
        }}
      >
        {!displayPhotoUrl && <PersonIcon sx={{ fontSize: size * 0.6 }} />}
      </Avatar>

      {isLoading && (
        <LoadingOverlay>
          <CircularProgress size={size * 0.3} color="inherit" />
        </LoadingOverlay>
      )}

      {showEditButton && !isLoading && (
        <PhotoIconButton onClick={handleMenuOpen} size="small">
          <PhotoCameraIcon sx={{ fontSize: 16 }} />
        </PhotoIconButton>
      )}

      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "right",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "right",
        }}
      >
        {Capacitor.isNativePlatform() ? (
          // Mobile options
          <>
            <MenuItem onClick={handleCameraCapture}>
              <ListItemIcon>
                <PhotoCameraIcon />
              </ListItemIcon>
              <ListItemText primary={t("takePhoto", "Take Photo")} />
            </MenuItem>
            <MenuItem onClick={handlePhotoSelect}>
              <ListItemIcon>
                <PhotoLibraryIcon />
              </ListItemIcon>
              <ListItemText
                primary={t("selectFromPhotos", "Select from Photos")}
              />
            </MenuItem>
          </>
        ) : (
          // Web option
          <MenuItem onClick={handlePhotoSelect}>
            <ListItemIcon>
              <PhotoLibraryIcon />
            </ListItemIcon>
            <ListItemText
              primary={t("chooseFromGallery", "Choose from Gallery")}
            />
          </MenuItem>
        )}
      </Menu>
    </PhotoContainer>
  );
};

export default ProfilePhoto;
