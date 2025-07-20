import React from "react";
import Dashboard from "../components/Dashboard";
import DashboardItem from "../components/DashboardItem";

const DashboardScreen: React.FC = () => (
  <Dashboard>
    <DashboardItem title="Placeholder 1">
      Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque
      vitae velit ex.
    </DashboardItem>
    <DashboardItem title="Placeholder 2">
      Mauris dapibus risus quis suscipit vulputate. Egestas purus viverra
      accumsan in nisl nisi.
    </DashboardItem>
    <DashboardItem title="Placeholder 3">
      Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere
      cubilia curae.
    </DashboardItem>
    <DashboardItem title="Placeholder 4">
      Curabitur non nulla sit amet nisl tempus convallis quis ac lectus.
    </DashboardItem>
  </Dashboard>
);

export default DashboardScreen;
