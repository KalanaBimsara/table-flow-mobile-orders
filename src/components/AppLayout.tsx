
import { Outlet } from "react-router-dom";
import AppHeaderWrapper from "./AppHeaderWrapper";

const AppLayout = () => {
  return (
    <>
      <AppHeaderWrapper />
      <main>
        <Outlet />
      </main>
    </>
  );
};

export default AppLayout;
