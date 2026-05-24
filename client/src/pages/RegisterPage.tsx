import React from 'react';
import RegisterScreen from '../components/RegisterScreen';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const RegisterPage: React.FC = () => {
    const { register } = useAuth();
    const navigate = useNavigate();

    const handleRegister = async (name: string, email: string, password: string) => {
        await register(name, email, password);
        const session = sessionStorage.getItem('userSession');
        const isAdmin = session ? JSON.parse(session).isAdmin : false;
        navigate(isAdmin ? '/admin' : '/'); // Redirect based on role
    };

    return (
        <RegisterScreen
            onRegister={handleRegister}
            onSwitchToLogin={() => navigate('/login')}
        />
    );
};

export default RegisterPage;
