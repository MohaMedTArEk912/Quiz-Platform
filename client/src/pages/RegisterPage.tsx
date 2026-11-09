import React from 'react';
import RegisterScreen from '../components/RegisterScreen';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const RegisterPage: React.FC = () => {
    const { register } = useAuth();
    const navigate = useNavigate();

    const handleRegister = async (name: string, email: string, password: string) => {
        const result = await register(name, email, password);
        const isAdmin = Boolean(result?.isAdmin || result?.user?.role === 'admin');
        navigate(isAdmin ? '/admin' : '/', { replace: true });
    };

    return (
        <RegisterScreen
            onRegister={handleRegister}
            onSwitchToLogin={() => navigate('/login')}
        />
    );
};

export default RegisterPage;
