import * as React from "react";
import Grid from "@mui/material/Grid";
import { styled } from "@mui/material/styles";

const StyledGridContainer = styled(Grid)({
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: "1.5rem",
  padding: "2rem",
});

const Dashboard: React.FC<React.PropsWithChildren> = ({ children }) => (
  <StyledGridContainer>
    {React.Children.toArray(children).map((child, idx) => (
      <Grid key={idx} size={{ xs: 12, sm: 6, md: 4, lg: 3, xl: 2 }}>
        {child}
      </Grid>
    ))}
  </StyledGridContainer>
);

export default Dashboard;
