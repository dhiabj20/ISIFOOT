// App.js
import React from 'react';
import AppNavigator from './src/navigation/AppNavigator';
import { ThemeProvider } from './src/context/ThemeContext';
import { TopMessageProvider } from './src/context/TopMessageContext';

export default function App() {
  return (
    <ThemeProvider>
      <TopMessageProvider>
        <AppNavigator />
      </TopMessageProvider>
    </ThemeProvider>
  );
}
