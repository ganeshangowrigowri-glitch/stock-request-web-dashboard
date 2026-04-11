import React from 'react';
import { AppBar, Toolbar, Typography, Button, Box } from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { logoutUser } = useAuth();

  const navItems = [
    { label: 'Dashboard',        path: '/' },
    { label: 'Requests',         path: '/requests' },
    { label: 'Order Summary',    path: '/sales-summary' },
    { label: 'Brand Management', path: '/brands' },
    { label: 'Notifications',    path: '/notifications' },
    { label: 'Shop Management',  path: '/shops' },
  ];

  const handleLogout = () => {
    logoutUser();
    navigate('/login');
  };

  return (
    <AppBar position="static" sx={{ backgroundColor: '#1a3a5c' }}>
      <Toolbar>
        <Typography variant="h6" sx={{ mr: 4, fontWeight: 600 }}>
          🍷 Stock Request System
        </Typography>
        <Box sx={{ flexGrow: 1, display: 'flex', gap: 1 }}>
          {navItems.map((item) => (
            <Button
              key={item.path}
              color="inherit"
              onClick={() => navigate(item.path)}
              sx={{
                fontWeight: location.pathname === item.path ? 700 : 400,
                borderBottom: location.pathname === item.path ? '2px solid white' : 'none',
                borderRadius: 0,
              }}
            >
              {item.label}
            </Button>
          ))}
        </Box>
        <Button color="inherit" onClick={handleLogout}>Logout</Button>
      </Toolbar>
    </AppBar>
  );
}
