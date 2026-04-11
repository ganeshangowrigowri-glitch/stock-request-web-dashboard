import React, { useState, useEffect } from 'react';
import {
  Box, Card, CardContent, Typography, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow,
  Chip, Button, CircularProgress,
} from '@mui/material';
import { getAllNotifications, markNotificationRead, deleteNotification, clearAllNotifications } from '../api/index';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchNotifications(); }, []);

  const fetchNotifications = async () => {
    try {
      const data = await getAllNotifications();
      setNotifications(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkRead = async (id) => {
    try {
      await markNotificationRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: 1 } : n));
    } catch (error) {
      console.error(error);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteNotification(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (error) {
      console.error(error);
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm('Clear all notifications?')) return;
    try {
      await clearAllNotifications();
      setNotifications([]);
    } catch (error) {
      console.error(error);
    }
  };

  const unread = notifications.filter(n => !n.is_read).length;

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  return (
    <Box sx={{ p: 3, backgroundColor: '#f5f6fa', minHeight: '100vh' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="h5" fontWeight={600} color="#1a3a5c">Notifications</Typography>
          {unread > 0 && (
            <Chip label={`${unread} unread`} size="small"
              sx={{ backgroundColor: '#fff3cd', color: '#856404', fontWeight: 600 }} />
          )}
        </Box>
        <Button
          variant="outlined" color="error" size="small"
          onClick={handleClearAll} sx={{ fontWeight: 600 }}
        >
          Clear All
        </Button>
      </Box>

      <Card sx={{ borderRadius: 2, boxShadow: 1 }}>
        <CardContent>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : notifications.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <Typography color="text.secondary">No notifications</Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ backgroundColor: '#1a3a5c' }}>
                    <TableCell sx={{ color: 'white', fontWeight: 600 }}>Shop Name</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 600 }}>Message</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 600 }}>Date & Time</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 600 }}>Status</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 600 }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {notifications.map((notif, index) => (
                    <TableRow
                      key={notif.id}
                      sx={{ backgroundColor: !notif.is_read ? '#fff8e1' : index % 2 === 0 ? 'white' : '#f9fafb' }}
                    >
                      <TableCell sx={{ fontWeight: 500, fontSize: 12 }}>{notif.shop_name}</TableCell>
                      <TableCell sx={{ fontSize: 12 }}>{notif.message}</TableCell>
                      <TableCell sx={{ fontSize: 12 }}>{formatDate(notif.created_at)}</TableCell>
                      <TableCell>
                        <Chip
                          label={notif.is_read ? 'Read' : 'Unread'} size="small"
                          sx={{
                            backgroundColor: notif.is_read ? '#e8f0f7' : '#fff3cd',
                            color: notif.is_read ? '#1a3a5c' : '#856404',
                            fontWeight: 600, fontSize: 11,
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          {!notif.is_read && (
                            <Button
                              size="small" variant="outlined"
                              onClick={() => handleMarkRead(notif.id)}
                              sx={{ borderColor: '#1a3a5c', color: '#1a3a5c', fontSize: 11 }}
                            >
                              Mark Read
                            </Button>
                          )}
                          <Button
                            size="small" variant="outlined" color="error"
                            onClick={() => handleDelete(notif.id)}
                            sx={{ fontSize: 11 }}
                          >
                            Delete
                          </Button>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
