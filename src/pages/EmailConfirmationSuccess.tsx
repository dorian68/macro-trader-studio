import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle } from 'lucide-react';

export default function EmailConfirmationSuccess() {
  const navigate = useNavigate();

  useEffect(() => {
    // Set document title
    document.title = "Email Confirmed - Alphalens";
  }, []);

  const handleGoToLogin = () => {
    navigate('/auth');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] text-white p-4">
      <Card className="w-full max-w-md text-center bg-[#0a0a0a] border-white/10">
        <CardHeader className="space-y-4">
          {/* Alphalens Logo */}
          <div className="flex justify-center mb-1">
            <img
              src="/logo_v2.png"
              alt="Alphalens"
              className="h-24 w-auto"
            />
          </div>

          {/* Success Icon */}
          <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-12 w-12 text-green-500" />
          </div>

          {/* Success Message */}
          <h1 className="text-2xl font-bold text-white">
            Your email has been successfully confirmed ✅
          </h1>
        </CardHeader>

        <CardContent className="space-y-6">
          <p className="text-gray-400 text-lg">
            Welcome to Alphalens. Your account is now verified. You can proceed to login and start using the platform.
          </p>

          {/* Additional Info */}
          <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-4">
            <p className="text-sm text-blue-300">
              🎉 Your account has been successfully activated and is ready to use. Our team will review your registration for full access.
            </p>
          </div>

          {/* CTA Button */}
          <Button
            onClick={handleGoToLogin}
            className="w-full h-12 text-lg font-semibold bg-white text-black hover:bg-gray-200 border-none"
            size="lg"
          >
            Go to Login
          </Button>

          {/* Footer Text */}
          <p className="text-xs text-gray-500 mt-6">
            If you have any questions, please contact our support team.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}