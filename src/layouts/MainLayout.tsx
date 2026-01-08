import { useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  CssBaseline,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material'
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Work as WorkIcon,
  Folder as FolderIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material'

interface NavItem {
  text: string
  icon: JSX.Element
  path: string
}

const navItems: NavItem[] = [
  { text: 'Dashboard', icon: <DashboardIcon />, path: '/' },
  { text: 'Jobs', icon: <WorkIcon />, path: '/jobs' },
  { text: 'Profiles', icon: <FolderIcon />, path: '/profiles' },
  { text: 'Settings', icon: <SettingsIcon />, path: '/settings' },
]

export default function MainLayout() {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const navigate = useNavigate()
  const location = useLocation()
  const open = Boolean(anchorEl)

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleMenuClose = () => {
    setAnchorEl(null)
  }

  const handleNavigation = (path: string) => {
    navigate(path)
    handleMenuClose()
  }

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <AppBar position="fixed">
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open menu"
            aria-controls={open ? 'navigation-menu' : undefined}
            aria-haspopup="true"
            aria-expanded={open ? 'true' : undefined}
            edge="start"
            onClick={handleMenuClick}
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div">
            CUCM Log Collector
          </Typography>
        </Toolbar>
      </AppBar>

      {/* Hamburger Menu Popup */}
      <Menu
        id="navigation-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleMenuClose}
        MenuListProps={{
          'aria-labelledby': 'menu-button',
        }}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        slotProps={{
          paper: {
            sx: {
              bgcolor: '#1a1a2e',
              color: 'white',
              borderRadius: 2,
              minWidth: 180,
              mt: 1,
              '& .MuiMenuItem-root': {
                py: 1.5,
                px: 2,
                '&:hover': {
                  bgcolor: 'rgba(255, 255, 255, 0.1)',
                },
                '&.Mui-selected': {
                  bgcolor: 'rgba(4, 159, 217, 0.3)',
                  '&:hover': {
                    bgcolor: 'rgba(4, 159, 217, 0.4)',
                  },
                },
              },
              '& .MuiListItemIcon-root': {
                color: 'white',
                minWidth: 40,
              },
              '& .MuiListItemText-primary': {
                color: 'white',
                fontWeight: 500,
              },
            },
          },
        }}
      >
        {navItems.map(item => (
          <MenuItem
            key={item.text}
            selected={location.pathname === item.path}
            onClick={() => handleNavigation(item.path)}
          >
            <ListItemIcon>{item.icon}</ListItemIcon>
            <ListItemText primary={item.text} />
          </MenuItem>
        ))}
      </Menu>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: '100%',
        }}
      >
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  )
}
