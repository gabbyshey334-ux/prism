
import React, { useState } from "react";
import { prism } from "@/api/prismClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { User, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { auth as firebaseAuth } from "@/lib/firebaseClient";
import { updateProfile } from "firebase/auth";

export default function Settings() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("account");
  const [isCheckingAuth, setIsCheckingAuth] = React.useState(true);

  // Check authentication
  React.useEffect(() => {
    const checkAuth = async () => {
      try {
        const isAuth = await prism.auth.isAuthenticated();
        if (!isAuth) {
          prism.auth.redirectToLogin(window.location.pathname);
          return;
        }
      } catch (error) {
        // If isAuthenticated throws an error (e.g., network issue, invalid token format),
        // treat it as unauthenticated and redirect to login.
        prism.auth.redirectToLogin(window.location.pathname);
      } finally {
        setIsCheckingAuth(false);
      }
    };
    checkAuth();
  }, []); // Empty dependency array means this effect runs once on mount

  // Fetch current user data
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => prism.auth.me(),
    enabled: !isCheckingAuth, // Only fetch user data if auth check is complete
  });

  // State for user data form
  const [userData, setUserData] = useState({
    full_name: "",
  });

  // Effect to update userData when user data is fetched or changes
  React.useEffect(() => {
    const resolved = (user?.full_name || user?.name || firebaseAuth?.currentUser?.displayName || (user?.email ? user.email.split('@')[0] : ""));
    setUserData({ full_name: resolved || "" });
  }, [user]);

  // Mutation to update user profile
  const updateUserMutation = useMutation({
    mutationFn: (data) => prism.auth.updateMe(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      toast.success("Profile updated!");
    },
    onError: (error) => {
        toast.error(`Failed to update profile: ${error.message}`);
    }
  });

  // Handler for saving user profile changes
  const handleSaveProfile = async () => {
    try {
      await Promise.all([
        updateUserMutation.mutateAsync(userData).catch(() => {}),
        (firebaseAuth.currentUser ? updateProfile(firebaseAuth.currentUser, { displayName: userData.full_name }) : Promise.resolve())
      ]);
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      toast.success("Profile updated!");
    } catch (e) {
      toast.error(e?.message || "Failed to update profile");
    }
  };

  const handleLogout = async () => {
    if (confirm("Are you sure you want to logout?")) {
      try { await prism.auth.logout(); } catch {}
      window.location.href = '/login';
    }
  };

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--background)' }}>
        <Loader2 className="w-12 h-12 animate-spin" style={{ color: '#88925D' }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 md:p-8" style={{ backgroundColor: 'var(--background)' }}>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-bold mb-2" style={{ color: 'var(--text)' }}>
          Settings
        </h1>
        <p className="text-lg mb-8" style={{ color: 'var(--text-muted)' }}>
          Manage your account and preferences
        </p>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-white rounded-xl border-2 p-1 mb-6" style={{ borderColor: 'var(--border)' }}>
            <TabsTrigger value="account">Account</TabsTrigger>
            <TabsTrigger value="privacy">Privacy Policy</TabsTrigger>
            <TabsTrigger value="terms">Terms of Use</TabsTrigger>
          </TabsList>

          <TabsContent value="account">
            {/* Account Tab Content */}
            <Card className="border-0 rounded-2xl shadow-lg" style={{ backgroundColor: 'var(--card)' }}>
              <CardContent className="p-6 space-y-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center"
                       style={{ backgroundColor: 'var(--accent-light)' }}>
                    <User className="w-8 h-8" style={{ color: 'var(--primary)' }} />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold" style={{ color: 'var(--text)' }}>
                      {userData.full_name || 'User'}
                    </h2>
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                      {user?.email}
                    </p>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block" style={{ color: 'var(--text)' }}>
                    Full Name
                  </label>
                  <Input
                    value={userData.full_name}
                    onChange={(e) => setUserData({...userData, full_name: e.target.value})}
                    className="rounded-xl border-2"
                    style={{ borderColor: 'var(--border)' }}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block" style={{ color: 'var(--text)' }}>
                    Email
                  </label>
                  <Input
                    value={user?.email || ""}
                    disabled
                    className="rounded-xl border-2 bg-gray-50"
                    style={{ borderColor: 'var(--border)' }}
                  />
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                    Email cannot be changed
                  </p>
                </div>

                <Button
                  onClick={handleSaveProfile}
                  disabled={updateUserMutation.isPending}
                  className="w-full rounded-xl h-12 shadow-md hover:shadow-lg transition-all"
                  style={{ 
                    background: 'linear-gradient(135deg, #88925D 0%, #A4B58B 100%)',
                    color: 'white'
                  }}
                >
                  <Save className="w-5 h-5 mr-2" />
                  Save Changes
                </Button>

                {/* Logout Section */}
                <div className="pt-6 border-t" style={{ borderColor: 'var(--border)' }}>
                  <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text)' }}>
                    Account Actions
                  </h3>
                  <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
                    Sign out of your account
                  </p>
                  <Button
                    onClick={handleLogout}
                    variant="outline"
                    className="w-full rounded-xl h-12 border-2 text-red-600 hover:bg-red-50 hover:border-red-300"
                    style={{ borderColor: 'rgba(239, 68, 68, 0.3)' }}
                  >
                    Logout
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Privacy Policy Tab Content */}
          <TabsContent value="privacy">
            <Card className="border-2 rounded-2xl shadow-lg" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--card)' }}>
              <CardContent className="p-8">
                <h2 className="text-2xl font-bold mb-6" style={{ color: 'var(--text)' }}>Privacy Policy</h2>
                
                <div className="space-y-6 prose prose-sm max-w-none" style={{ color: 'var(--text)' }}>
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                    Last Updated: {new Date().toLocaleDateString()}
                  </p>

                  <section>
                    <h3 className="text-lg font-semibold mb-3">1. Introduction</h3>
                    <p>Welcome to Prism ("we," "our," or "us"). We are committed to protecting your privacy and ensuring the security of your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our AI-powered viral content generation platform.</p>
                  </section>

                  <section>
                    <h3 className="text-lg font-semibold mb-3">2. Information We Collect</h3>
                    
                    <p className="font-semibold mt-3 mb-2">2.1 Information You Provide:</p>
                    <ul className="list-disc pl-6 space-y-1">
                      <li>Account information (name, email address)</li>
                      <li>Brand information (brand names, descriptions, colors, values)</li>
                      <li>Content you create or upload (ideas, images, videos, text)</li>
                      <li>Social media account connections (when you choose to connect)</li>
                      <li>Communication with our support team</li>
                    </ul>

                    <p className="font-semibold mt-3 mb-2">2.2 Automatically Collected Information:</p>
                    <ul className="list-disc pl-6 space-y-1">
                      <li>Usage data (features used, time spent, interactions)</li>
                      <li>Device information (browser type, operating system, IP address)</li>
                      <li>Cookies and similar tracking technologies</li>
                      <li>Analytics data to improve our services</li>
                    </ul>
                  </section>

                  <section>
                    <h3 className="text-lg font-semibold mb-3">3. How We Use Your Information</h3>
                    <p>We use your information to:</p>
                    <ul className="list-disc pl-6 space-y-1">
                      <li>Provide and improve the Prism platform</li>
                      <li>Generate AI-powered content recommendations</li>
                      <li>Analyze trends and viral content patterns</li>
                      <li>Schedule and publish content to your social media accounts</li>
                      <li>Personalize your experience</li>
                      <li>Send you important updates and notifications</li>
                      <li>Provide customer support</li>
                      <li>Ensure platform security and prevent fraud</li>
                      <li>Comply with legal obligations</li>
                    </ul>
                  </section>

                  <section>
                    <h3 className="text-lg font-semibold mb-3">4. AI and Content Processing</h3>
                    <p>Prism uses artificial intelligence to:</p>
                    <ul className="list-disc pl-6 space-y-1">
                      <li>Analyze trending topics and viral content patterns</li>
                      <li>Generate content recommendations and suggestions</li>
                      <li>Create text, images, and other creative assets</li>
                      <li>Optimize content for different platforms</li>
                    </ul>
                    <p className="mt-2">Your content may be processed by our AI systems and third-party AI providers (such as OpenAI, IMG.LY) to provide these services. We do not use your content to train AI models without your explicit consent.</p>
                  </section>

                  <section>
                    <h3 className="text-lg font-semibold mb-3">5. Information Sharing and Disclosure</h3>
                    
                    <p className="font-semibold mt-3 mb-2">We may share your information with:</p>
                    <ul className="list-disc pl-6 space-y-1">
                      <li><strong>Service Providers:</strong> Third-party vendors who help us operate the platform (hosting, analytics, AI services, payment processing)</li>
                      <li><strong>Social Media Platforms:</strong> When you connect your accounts and authorize posting</li>
                      <li><strong>Legal Requirements:</strong> When required by law, court order, or government authority</li>
                      <li><strong>Business Transfers:</strong> In connection with mergers, acquisitions, or asset sales</li>
                    </ul>

                    <p className="mt-3">We do NOT:</p>
                    <ul className="list-disc pl-6 space-y-1">
                      <li>Sell your personal information to third parties</li>
                      <li>Share your content publicly without your permission</li>
                      <li>Use your data for unrelated marketing purposes</li>
                    </ul>
                  </section>

                  <section>
                    <h3 className="text-lg font-semibold mb-3">6. Data Storage and Security</h3>
                    <p>We implement industry-standard security measures to protect your information, including:</p>
                    <ul className="list-disc pl-6 space-y-1">
                      <li>Encryption of data in transit and at rest</li>
                      <li>Secure cloud storage infrastructure</li>
                      <li>Regular security audits and updates</li>
                      <li>Access controls and authentication</li>
                      <li>Employee training on data protection</li>
                    </ul>
                    <p className="mt-2">However, no method of transmission over the Internet is 100% secure. While we strive to protect your information, we cannot guarantee absolute security.</p>
                  </section>

                  <section>
                    <h3 className="text-lg font-semibold mb-3">7. Your Rights and Choices</h3>
                    <p>You have the right to:</p>
                    <ul className="list-disc pl-6 space-y-1">
                      <li><strong>Access:</strong> Request a copy of your personal data</li>
                      <li><strong>Correction:</strong> Update or correct inaccurate information</li>
                      <li><strong>Deletion:</strong> Request deletion of your account and data</li>
                      <li><strong>Portability:</strong> Export your data in a machine-readable format</li>
                      <li><strong>Opt-Out:</strong> Unsubscribe from marketing communications</li>
                      <li><strong>Withdraw Consent:</strong> Revoke permissions for data processing</li>
                    </ul>
                    <p className="mt-2">To exercise these rights, contact us at <a href="mailto:liz@lizontheweb.com" className="text-blue-600 underline">liz@lizontheweb.com</a></p>
                  </section>

                  <section>
                    <h3 className="text-lg font-semibold mb-3">8. Cookies and Tracking</h3>
                    <p>We use cookies and similar technologies to:</p>
                    <ul className="list-disc pl-6 space-y-1">
                      <li>Remember your preferences and settings</li>
                      <li>Analyze platform usage and performance</li>
                      <li>Improve user experience</li>
                      <li>Provide personalized content</li>
                    </ul>
                    <p className="mt-2">You can control cookies through your browser settings, but disabling them may affect platform functionality.</p>
                  </section>

                  <section>
                    <h3 className="text-lg font-semibold mb-3">9. Third-Party Services</h3>
                    <p>Prism integrates with third-party platforms (social media, AI providers, etc.). Your use of these integrations is subject to their respective terms of service. Prism is not responsible for third-party services or their actions.</p>
                  </section>

                  <section>
                    <h3 className="text-lg font-semibold mb-3">10. Children's Privacy</h3>
                    <p>Prism is not intended for users under the age of 13 (or 16 in the EU). We do not knowingly collect information from children. If we discover that we have collected information from a child, we will delete it immediately.</p>
                  </section>

                  <section>
                    <h3 className="text-lg font-semibold mb-3">11. International Data Transfers</h3>
                    <p>Your information may be transferred to and processed in countries other than your own. We ensure appropriate safeguards are in place to protect your data in accordance with this Privacy Policy and applicable laws.</p>
                  </section>

                  <section>
                    <h3 className="text-lg font-semibold mb-3">12. Data Retention</h3>
                    <p>We retain your information for as long as your account is active or as needed to provide services. When you delete your account, we will delete or anonymize your data within 30 days, except where we are required to retain it for legal purposes.</p>
                  </section>

                  <section>
                    <h3 className="text-lg font-semibold mb-3">13. Changes to This Privacy Policy</h3>
                    <p>We may update this Privacy Policy from time to time. We will notify you of significant changes by email or through the platform. Your continued use of Prism after changes constitutes acceptance of the updated policy.</p>
                  </section>

                  <section>
                    <h3 className="text-lg font-semibold mb-3">14. Contact Us</h3>
                    <p>If you have questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us:</p>
                    <div className="mt-3 p-4 rounded-lg" style={{ backgroundColor: 'var(--accent-light)' }}>
                      <p className="font-semibold" style={{ color: 'var(--primary-dark)' }}>Email: <a href="mailto:liz@lizontheweb.com" className="text-blue-600 underline">liz@lizontheweb.com</a></p>
                      <p className="mt-1"><strong>Subject Line:</strong> Privacy Policy Inquiry</p>
                    </div>
                  </section>

                  <div className="mt-8 p-4 rounded-lg" style={{ backgroundColor: 'var(--accent-light)' }}>
                    <p className="font-semibold" style={{ color: 'var(--primary-dark)' }}>
                      Last Updated: {new Date().toLocaleDateString()}
                    </p>
                    <p className="text-sm mt-2">
                      By using Prism, you acknowledge that you have read and understood this Privacy Policy.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Terms of Use Tab Content */}
          <TabsContent value="terms">
            <Card className="border-2 rounded-2xl shadow-lg" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--card)' }}>
              <CardContent className="p-8">
                <h2 className="text-2xl font-bold mb-6" style={{ color: 'var(--text)' }}>Terms of Use & Intellectual Property</h2>
                
                <div className="space-y-6 prose prose-sm max-w-none" style={{ color: 'var(--text)' }}>
                  <section>
                    <h3 className="text-lg font-semibold mb-3">1. Acceptance of Terms</h3>
                    <p>By accessing and using Prism ("the Service"), you agree to be bound by these Terms of Use. If you do not agree to these terms, please do not use the Service. These terms constitute a legally binding agreement between you and Prism.</p>
                  </section>

                  <section>
                    <h3 className="text-lg font-semibold mb-3">2. Intellectual Property Rights</h3>
                    <p className="mb-2"><strong>2.1 Service Ownership:</strong> The Prism platform, including its design, features, functionality, code, algorithms, AI models, and all intellectual property therein, is the exclusive property of Prism and its licensors. This includes but is not limited to:</p>
                    <ul className="list-disc pl-6 space-y-1">
                      <li>The concept and methodology of AI-powered viral content generation</li>
                      <li>The trend research and analysis algorithms</li>
                      <li>The content generation workflows and processes</li>
                      <li>All software, source code, and technical infrastructure</li>
                      <li>The user interface design and user experience flows</li>
                      <li>Branding, logos, and trademarks</li>
                    </ul>

                    <p className="mt-3 mb-2"><strong>2.2 Your Content:</strong> You retain all rights to content you create using the Service. However, you grant Prism a worldwide, non-exclusive, royalty-free license to use, reproduce, modify, and display your content solely for the purpose of:</p>
                    <ul className="list-disc pl-6 space-y-1">
                      <li>Providing and improving the Service</li>
                      <li>Marketing and promotional purposes with your explicit consent</li>
                      <li>Training and improving our AI models (you can opt-out in settings)</li>
                    </ul>

                    <p className="mt-3"><strong>2.3 Prohibition of Copying:</strong> You expressly agree NOT to:</p>
                    <ul className="list-disc pl-6 space-y-1">
                      <li>Copy, reproduce, or replicate the Prism platform or any of its features</li>
                      <li>Reverse engineer, decompile, or attempt to derive the source code</li>
                      <li>Create derivative works or competing services based on Prism</li>
                      <li>Use the Service's methodology, processes, or workflows to build similar products</li>
                      <li>Extract, scrape, or collect data from the Service using automated means</li>
                      <li>Remove, obscure, or alter any proprietary rights notices</li>
                      <li>Resell, sublicense, or redistribute the Service</li>
                    </ul>
                  </section>

                  <section>
                    <h3 className="text-lg font-semibold mb-3">3. License to Use</h3>
                    <p>Subject to your compliance with these Terms, Prism grants you a limited, non-exclusive, non-transferable, revocable license to access and use the Service for your personal or business content creation purposes.</p>
                  </section>

                  <section>
                    <h3 className="text-lg font-semibold mb-3">4. User Responsibilities</h3>
                    <p>You are responsible for:</p>
                    <ul className="list-disc pl-6 space-y-1">
                      <li>Maintaining the confidentiality of your account credentials</li>
                      <li>All activity that occurs under your account</li>
                      <li>Ensuring your content complies with applicable laws and regulations</li>
                      <li>Obtaining necessary rights and permissions for any content you upload</li>
                      <li>Complying with social media platform terms of service</li>
                      <li>Not engaging in any activity that disrupts or interferes with the Service</li>
                    </ul>
                  </section>

                  <section>
                    <h3 className="text-lg font-semibold mb-3">5. Prohibited Uses</h3>
                    <p>You agree not to use the Service to:</p>
                    <ul className="list-disc pl-6 space-y-1">
                      <li>Violate any applicable laws or regulations</li>
                      <li>Infringe upon the rights of others</li>
                      <li>Generate harmful, offensive, illegal, or fraudulent content</li>
                      <li>Spread misinformation or engage in deceptive practices</li>
                      <li>Harass, abuse, or harm others</li>
                      <li>Impersonate any person or entity</li>
                      <li>Attempt to gain unauthorized access to the Service or other accounts</li>
                      <li>Interfere with or disrupt the Service's operation</li>
                      <li>Upload viruses, malware, or other malicious code</li>
                      <li>Engage in any form of spam or unsolicited communications</li>
                    </ul>
                  </section>

                  <section>
                    <h3 className="text-lg font-semibold mb-3">6. AI-Generated Content</h3>
                    <p>Prism uses AI to generate content suggestions and creative assets. You acknowledge that:</p>
                    <ul className="list-disc pl-6 space-y-1">
                      <li>AI-generated content may not always be accurate or appropriate</li>
                      <li>You are responsible for reviewing and approving all content before publishing</li>
                      <li>AI suggestions should be used as creative inspiration, not absolute guidance</li>
                      <li>You must ensure AI-generated content complies with applicable laws</li>
                      <li>Prism is not liable for issues arising from AI-generated content</li>
                    </ul>
                  </section>

                  <section>
                    <h3 className="text-lg font-semibold mb-3">7. Third-Party Integrations</h3>
                    <p>The Service integrates with third-party platforms (social media, AI providers, etc.). Your use of these integrations is subject to their respective terms of service. Prism is not responsible for third-party services or their actions.</p>
                  </section>

                  <section>
                    <h3 className="text-lg font-semibold mb-3">8. Payment and Subscription</h3>
                    <p>(If applicable) Subscription fees are billed in advance and are non-refundable except as required by law. You may cancel your subscription at any time, but you will not receive a refund for the current billing period.</p>
                  </section>

                  <section>
                    <h3 className="text-lg font-semibold mb-3">9. Confidentiality</h3>
                    <p>Any non-public information about the Service's operation, algorithms, business processes, or technical infrastructure is considered confidential and proprietary. You agree to maintain such information in strict confidence and not disclose it to third parties.</p>
                  </section>

                  <section>
                    <h3 className="text-lg font-semibold mb-3">10. Termination</h3>
                    <p>Prism reserves the right to terminate or suspend your access to the Service immediately, without prior notice, for any breach of these Terms, including but not limited to:</p>
                    <ul className="list-disc pl-6 space-y-1">
                      <li>Attempts to copy, replicate, or reverse engineer the Service</li>
                      <li>Violation of prohibited uses</li>
                      <li>Non-payment of fees (if applicable)</li>
                      <li>Fraudulent or illegal activity</li>
                    </ul>
                    <p className="mt-2">Upon termination, your right to use the Service will immediately cease. You may also terminate your account at any time through your account settings.</p>
                  </section>

                  <section>
                    <h3 className="text-lg font-semibold mb-3">11. Disclaimer of Warranties</h3>
                    <p>THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, NON-INFRINGEMENT, OR ACCURACY OF CONTENT.</p>
                    <p className="mt-2">Prism does not warrant that:</p>
                    <ul className="list-disc pl-6 space-y-1">
                      <li>The Service will be uninterrupted, secure, or error-free</li>
                      <li>AI-generated content will be accurate or suitable for your purposes</li>
                      <li>Content generated through the Service will achieve viral success</li>
                      <li>The Service will meet all your requirements</li>
                    </ul>
                  </section>

                  <section>
                    <h3 className="text-lg font-semibold mb-3">12. Limitation of Liability</h3>
                    <p>TO THE MAXIMUM EXTENT PERMITTED BY LAW, PRISM SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING OUT OF OR RELATED TO YOUR USE OF THE SERVICE, INCLUDING BUT NOT LIMITED TO:</p>
                    <ul className="list-disc pl-6 space-y-1">
                      <li>Loss of profits, revenue, or business opportunities</li>
                      <li>Loss of data or content</li>
                      <li>Reputational harm</li>
                      <li>Costs of substitute services</li>
                      <li>Failure to achieve expected results</li>
                    </ul>
                    <p className="mt-2">In no event shall Prism's total liability exceed the amount you paid for the Service in the 12 months preceding the claim.</p>
                  </section>

                  <section>
                    <h3 className="text-lg font-semibold mb-3">13. Indemnification</h3>
                    <p>You agree to indemnify, defend, and hold harmless Prism and its officers, directors, employees, and agents from any claims, liabilities, damages, losses, costs, or expenses (including legal fees) arising from:</p>
                    <ul className="list-disc pl-6 space-y-1">
                      <li>Your use of the Service</li>
                      <li>Your content or actions</li>
                      <li>Your violation of these Terms</li>
                      <li>Your violation of any third-party rights</li>
                    </ul>
                  </section>

                  <section>
                    <h3 className="text-lg font-semibold mb-3">14. Governing Law</h3>
                    <p>These Terms shall be governed by and construed in accordance with the laws of [Your Jurisdiction], without regard to its conflict of law provisions. Any disputes shall be resolved in the courts of [Your Jurisdiction].</p>
                  </section>

                  <section>
                    <h3 className="text-lg font-semibold mb-3">15. Changes to Terms</h3>
                    <p>Prism reserves the right to modify these Terms at any time. We will notify you of significant changes by email or through the platform. Your continued use of the Service after changes constitutes acceptance of the modified Terms.</p>
                  </section>

                  <section>
                    <h3 className="text-lg font-semibold mb-3">16. Severability</h3>
                    <p>If any provision of these Terms is found to be unenforceable or invalid, that provision shall be limited or eliminated to the minimum extent necessary, and the remaining provisions shall remain in full force and effect.</p>
                  </section>

                  <section>
                    <h3 className="text-lg font-semibold mb-3">17. Entire Agreement</h3>
                    <p>These Terms, together with our Privacy Policy, constitute the entire agreement between you and Prism regarding the Service and supersede all prior agreements and understandings.</p>
                  </section>

                  <section>
                    <h3 className="text-lg font-semibold mb-3">18. Contact</h3>
                    <p>For questions about these Terms, please contact us:</p>
                    <div className="mt-3 p-4 rounded-lg" style={{ backgroundColor: 'var(--accent-light)' }}>
                      <p className="font-semibold" style={{ color: 'var(--primary-dark)' }}>
                        Email: <a href="mailto:liz@lizontheweb.com" className="text-blue-600 underline">liz@lizontheweb.com</a>
                      </p>
                      <p className="mt-1"><strong>Subject Line:</strong> Terms of Use Inquiry</p>
                    </div>
                  </section>

                  <div className="mt-8 p-4 rounded-lg" style={{ backgroundColor: 'var(--accent-light)' }}>
                    <p className="font-semibold" style={{ color: 'var(--primary-dark)' }}>
                      Last Updated: {new Date().toLocaleDateString()}
                    </p>
                    <p className="text-sm mt-2">
                      By using Prism, you acknowledge that you have read, understood, and agree to be bound by these Terms of Use.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
