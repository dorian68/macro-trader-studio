import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Mail, Phone, MapPin, Send } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import PublicNavbar from "@/components/PublicNavbar";
import { useTranslation } from 'react-i18next';
import { Footer } from '@/components/Footer';
export default function Contact() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation('contact');
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    company: "",
    message: ""
  });
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Basic validation
    if (!formData.name.trim() || !formData.email.trim() || !formData.message.trim()) {
      toast.error(t('toasts.fillRequired'));
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast.error(t('toasts.invalidEmail'));
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`https://jqrlegdulnnrpiixiecf.supabase.co/functions/v1/send-contact-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpxcmxlZ2R1bG5ucnBpaXhpZWNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0MDYzNDgsImV4cCI6MjA2OTk4MjM0OH0.on2S0WpM45atAYvLU8laAZJ-abS4RcMmfiqW7mLtT_4'}`
        },
        body: JSON.stringify(formData)
      });
      if (!response.ok) {
        throw new Error('Failed to send email');
      }
      toast.success(t('toasts.success'));

      // Reset form
      setFormData({
        name: "",
        email: "",
        company: "",
        message: ""
      });
    } catch (error) {
      console.error("Error sending contact form:", error);
      toast.error(t('toasts.error'));
    } finally {
      setLoading(false);
    }
  };
  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };
  return <div className="min-h-screen bg-background">
    <PublicNavbar />

    {/* Hero Section */}
    <section className="pt-10 pb-8 px-4 text-center bg-gradient-to-br from-background via-background to-secondary/10">
      <div className="container mx-auto max-w-4xl">
        <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
          {t('hero.title')}
          <span className="text-primary"> {t('hero.titleHighlight')}</span>
        </h1>
        <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
          {t('hero.subtitle')}
        </p>
      </div>
    </section>

    {/* Main Content */}
    <section className="py-8 px-4 bg-background">
      <div className="container mx-auto max-w-6xl">
        <div className="grid lg:grid-cols-2 gap-12">
          {/* Contact Form */}
          <Card className="p-6 border-border">
            <CardHeader>
              <CardTitle className="text-2xl text-foreground mb-2">{t('form.title')}</CardTitle>
              <p className="text-muted-foreground">
                {t('form.description')}
              </p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">{t('form.name')} {t('form.requiredFields')}</Label>
                    <Input id="name" type="text" value={formData.name} onChange={e => handleInputChange("name", e.target.value)} placeholder={t('form.namePlaceholder')} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">{t('form.email')} {t('form.requiredFields')}</Label>
                    <Input id="email" type="email" value={formData.email} onChange={e => handleInputChange("email", e.target.value)} placeholder={t('form.emailPlaceholder')} required />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="company">{t('form.company')}</Label>
                  <Input id="company" type="text" value={formData.company} onChange={e => handleInputChange("company", e.target.value)} placeholder={t('form.companyPlaceholder')} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">{t('form.message')} {t('form.requiredFields')}</Label>
                  <Textarea id="message" value={formData.message} onChange={e => handleInputChange("message", e.target.value)} placeholder={t('form.messagePlaceholder')} rows={5} required />
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? <>
                    <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2" />
                    {t('form.sendingButton')}
                  </> : <>
                    <Send className="w-4 h-4 mr-2" />
                    {t('form.sendButton')}
                  </>}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <div className="space-y-8">
            <Card className="p-6 border-border">
              <CardHeader>
                <CardTitle className="text-xl text-foreground">{t('info.title')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-start space-x-4">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                    <Mail className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{t('info.email')}</h3>
                    <p className="text-muted-foreground">{t('info.emailValue')}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {t('info.emailNote')}
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                    <Phone className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{t('info.phone')}</h3>
                    <p className="text-muted-foreground">{t('info.phoneValue')}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {t('info.phoneNote')}
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{t('info.office')}</h3>
                    <p className="text-muted-foreground">{t('info.officeAddress')}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {t('info.officeNote')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="p-6 border-border">
              <CardHeader>
                <CardTitle className="text-xl text-foreground">{t('expect.title')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h3 className="font-semibold text-foreground">{t('expect.demo')}</h3>
                  <p className="text-sm text-muted-foreground">
                    {t('expect.demoDescription')}
                  </p>
                </div>

                <div className="space-y-2">
                  <h3 className="font-semibold text-foreground">{t('expect.inquiries')}</h3>
                  <p className="text-sm text-muted-foreground">
                    {t('expect.inquiriesDescription')}
                  </p>
                </div>

                <div className="space-y-2">
                  <h3 className="font-semibold text-foreground">{t('expect.partnership')}</h3>
                  <p className="text-sm text-muted-foreground">
                    {t('expect.partnershipDescription')}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>

    <Footer />
  </div>;
}