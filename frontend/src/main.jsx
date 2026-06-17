import React from "react";
import ReactDOM from "react-dom/client";
import { Provider, useDispatch } from 'react-redux';
import { store } from './app/store';
import { BrowserRouter as Router } from "react-router-dom";
import App from './App'; 
import { checkAuthStatus } from './features/auth/authSlice';
import "./index.css";

// Компонент-обертка для проверки авторизации при старте приложения
function RootWrapper({ children }) {
  const dispatch = useDispatch();

  React.useEffect(() => {
    console.log('Проверяю статус авторизации...');
    dispatch(checkAuthStatus());
  }, [dispatch]);
  
  return <>{children}</>;
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <Provider store={store}>
    <RootWrapper>
      <Router>
        <App />
      </Router>
    </RootWrapper>
  </Provider>
);