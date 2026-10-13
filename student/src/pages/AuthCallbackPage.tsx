import React, { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { PageLoader } from '../components/ui/Spinner';

/**
 * Receives Google OAuth2 callback from backend:
 * /auth/callback?token=JWT&refreshToken=JWT&userId=UUID&name=NAME&email=EMAIL&picture=URL
 */
export const AuthCallbackPage: React.FC = () => {
  const [params]  = useSearchParams();
  const { setTokenFromCallback } = useAuth();
  const navigate  = useNavigate();
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;

    const token        = params.get('token');
    const refreshToken = params.get('refreshToken');
    const error        = params.get('error');

    if (error || !token) {
      navigate('/login?error=' + encodeURIComponent(error ?? 'Login failed'), { replace: true });
      return;
    }

    const userData = {
      id:             params.get('userId')  ?? '',
      name:           params.get('name')    ?? '',
      email:          params.get('email')   ?? '',
      profilePicture: params.get('picture') ?? undefined,
    };

    setTokenFromCallback(token, refreshToken ?? '', userData);
    navigate('/dashboard', { replace: true });
  }, [params, setTokenFromCallback, navigate]);

  return <PageLoader />;
};
