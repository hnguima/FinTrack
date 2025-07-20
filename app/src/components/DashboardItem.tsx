import React from "react";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import { styled } from "@mui/material/styles";

interface DashboardItemProps {
  title?: string;
  children?: React.ReactNode;
}

const StyledPaper = styled(Paper)(() => ({
  padding: 24,
  borderRadius: 16,
  minHeight: 120,
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-start",
  justifyContent: "center",
}));

const StyledTitle = styled(Typography)(() => ({
  fontWeight: 600,
  fontSize: "1.1rem",
  marginBottom: "0.5rem",
}));

const StyledContent = styled(Typography)(() => ({
  color: "var(--mui-palette-text-secondary, #6c757d)",
  fontSize: "1rem",
}));

const DashboardItem: React.FC<DashboardItemProps> = ({ title, children }) => {
  return (
    <StyledPaper elevation={3}>
      {title && (
        <StyledTitle variant="h6" gutterBottom>
          {title}
        </StyledTitle>
      )}
      <StyledContent variant="body1" color="text.secondary">
        {children}
      </StyledContent>
    </StyledPaper>
  );
};

export default DashboardItem;
