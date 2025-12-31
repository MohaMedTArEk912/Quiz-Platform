import React from 'react';
import ForgotPassword from '../components/ForgotPassword';
import { useNavigate } from 'react-router-dom';

const ForgotPasswordPage: React.FC = () => {
    const navigate = useNavigate();

    return (
        <ForgotPassword
            onBack={() => navigate('/login')}
            onSuccess={() => navigate('/login')}
        />
    );
};

export default ForgotPasswordPage;
