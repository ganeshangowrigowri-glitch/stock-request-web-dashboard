import React, { useState } from 'react';
import {
  Box, Card, CardContent, TextField, Button,
  Typography, Alert, CircularProgress,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { login } from '../api/index';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { loginUser } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async () => {
    if (!username || !password) {
      setError('Please enter username and password');
      return;
    }
    try {
      setLoading(true);
      setError('');
      const data = await login(username, password);
      loginUser(data.user, data.token);
      navigate('/');
    } catch (err) {
      setError('Invalid username or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f5f6fa',
    }}>
      <Card sx={{ width: 400, borderRadius: 3, boxShadow: 3 }}>
        <Box sx={{ backgroundColor: '#1a3a5c', p: 3, textAlign: 'center' }}>
          <Typography variant="h5" color="white" fontWeight={600}>🍷 Stock Request System</Typography>
          <Typography variant="body2" color="rgba(255,255,255,0.7)" mt={0.5}>Head Office Dashboard</Typography>
        </Box>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h6" fontWeight={600} mb={3}>Sign In</Typography>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <TextField
            fullWidth label="Username" value={username}
            onChange={(e) => setUsername(e.target.value)}
            sx={{ mb: 2 }} size="small"
          />
          <TextField
            fullWidth label="Password" type="password" value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
            sx={{ mb: 3 }} size="small"
          />
          <Button
            fullWidth variant="contained" onClick={handleLogin}
            disabled={loading}
            sx={{ backgroundColor: '#1a3a5c', py: 1.5, fontWeight: 600 }}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : 'Login'}
          </Button>
        </CardContent>
      </Card>
    </Box>
  );
}

