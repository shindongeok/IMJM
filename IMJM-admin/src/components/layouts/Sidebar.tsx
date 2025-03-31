import { Box, List, ListItem, ListItemButton, ListItemText } from '@mui/material';
import { Link, useLocation } from 'react-router-dom';
import logoImage from "../../assets/images/IMJM-logo.png";


function Sidebar() {
    const location = useLocation();

    const menuItems = [
        { title: '대시보드', path: '/' },
        { title: '예약관리', path: '/Reservation' },
        { title: '미용실 정보 관리', path: '/Salon' },
        { title: '프로필 관리', path: '/Profile' },
        { title: '고객 관리', path: '/Customer' },
        { title: '채팅', path: '/Chat' },
        { title: '리뷰 관리', path: '/Review' },
        { title: '이벤트 관리', path: '/Event' }
    ];

    return (
        <Box
            sx={{
                width: 250,
                height: '100vh',
                position: 'fixed',
                left: 0,
                top: 0,
                bgcolor: '#FDF6F3',
                boxShadow: '2px 0 5px rgba(0, 0, 0, 0.1)',
                zIndex: 1000,
            }}
        >

            <Link to="/">
                <img
                    src={logoImage}
                    alt="IMJM Logo"
                    width="150"
                    height="150"
                />
            </Link>


            <List sx={{ padding: '0 1.5rem' }}>
                {menuItems.map((item) => (
                    <ListItem key={item.path} disablePadding sx={{ mb: 1 }}>
                        <ListItemButton
                            component={Link}
                            to={item.path}
                            selected={location.pathname === item.path}
                            sx={{
                                borderRadius: '6px',
                                color: location.pathname === item.path ? '#FDF6F3' : '#FF9080',
                                bgcolor: location.pathname === item.path ? '#FF9080' : 'transparent',
                                fontWeight: location.pathname === item.path ? 600 : 500,
                                position: 'relative',
                                '&:hover': {
                                    color: '#FDF6F3',
                                    bgcolor: '#FF9080'
                                },
                                '&.Mui-selected:before': {
                                    content: '""',
                                    position: 'absolute',
                                    left: '-1.5rem',
                                    top: 0,
                                    height: '100%',
                                    width: '4px',
                                    bgcolor: '#FF9080'
                                },
                                '&.Mui-selected': {
                                    bgcolor: '#FF9080 !important',
                                    color: '#FDF6F3 !important',
                                },
                            }}
                        >
                            <ListItemText primary={item.title} />
                        </ListItemButton>
                    </ListItem>
                ))}
            </List>
        </Box>
    );
}

export default Sidebar;