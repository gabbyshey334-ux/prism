import React from "react";
import { Card, CardContent } from "@/components/ui/card";

export default function Privacy() {
  return (
    <div className="min-h-screen p-6 md:p-8" style={{ backgroundColor: 'var(--background)' }}>
      <div className="max-w-4xl mx-auto">
        <Card className="border-0 rounded-2xl shadow-sm" style={{ backgroundColor: 'var(--card)' }}>
          <CardContent className="p-8 md:p-12">
            <h1 className="text-4xl font-bold mb-2" style={{ color: 'var(--text)' }}>
              Privacy Policy
            </h1>
            <p className="text-sm mb-8" style={{ color: 'var(--text-muted)' }}>
              Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>

            <div className="space-y-6 text-base leading-relaxed" style={{ color: 'var(--text)' }}>
              <section>
                <h2 className="text-2xl font-bold mb-3" style={{ color: 'var(--primary)' }}>
                  1. Introduction
                </h2>
                <p style={{ color: 'var(--text-muted)' }}>
                  Welcome to Prism. We respect your privacy and are committed to protecting your personal data. 
                  This privacy policy explains how we collect, use, and safeguard your information when you use our service.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold mb-3" style={{ color: 'var(--primary)' }}>
                  2. Information We Collect
                </h2>
                <p className="mb-3" style={{ color: 'var(--text-muted)' }}>
                  We collect the following types of information:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4" style={{ color: 'var(--text-muted)' }}>
                  <li><strong>Account Information:</strong> Email address, name, and profile information</li>
                  <li><strong>Content Data:</strong> Content ideas, generated text, images, and media you create or upload</li>
                  <li><strong>Social Media Connection Data:</strong> When you connect social media accounts, we store access tokens and basic profile information</li>
                  <li><strong>Usage Data:</strong> How you interact with our service, features used, and analytics data</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-bold mb-3" style={{ color: 'var(--primary)' }}>
                  3. How We Use Your Information
                </h2>
                <p className="mb-3" style={{ color: 'var(--text-muted)' }}>
                  We use your information to:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4" style={{ color: 'var(--text-muted)' }}>
                  <li>Provide and maintain our service</li>
                  <li>Generate AI-powered content based on your inputs</li>
                  <li>Publish content to your connected social media accounts</li>
                  <li>Analyze and improve our service</li>
                  <li>Communicate with you about your account and our service</li>
                  <li>Ensure security and prevent fraud</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-bold mb-3" style={{ color: 'var(--primary)' }}>
                  4. Social Media Integrations
                </h2>
                <p className="mb-3" style={{ color: 'var(--text-muted)' }}>
                  When you connect social media accounts:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4" style={{ color: 'var(--text-muted)' }}>
                  <li>We only request permissions necessary for publishing content</li>
                  <li>Your access tokens are encrypted and stored securely</li>
                  <li>We never access your personal messages or private data</li>
                  <li>You can disconnect accounts at any time from the Connections page</li>
                  <li>We comply with each platform's terms of service and data policies</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-bold mb-3" style={{ color: 'var(--primary)' }}>
                  5. Data Sharing and Disclosure
                </h2>
                <p style={{ color: 'var(--text-muted)' }}>
                  We do not sell your personal information. We may share your data only in the following circumstances:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4 mt-3" style={{ color: 'var(--text-muted)' }}>
                  <li><strong>Service Providers:</strong> Third-party services that help us operate (AI providers, hosting services)</li>
                  <li><strong>Social Media Platforms:</strong> When you explicitly authorize us to publish content</li>
                  <li><strong>Legal Requirements:</strong> If required by law or to protect our rights</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-bold mb-3" style={{ color: 'var(--primary)' }}>
                  6. Data Security
                </h2>
                <p style={{ color: 'var(--text-muted)' }}>
                  We implement industry-standard security measures to protect your data, including:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4 mt-3" style={{ color: 'var(--text-muted)' }}>
                  <li>Encryption of sensitive data in transit and at rest</li>
                  <li>Secure authentication and access controls</li>
                  <li>Regular security audits and updates</li>
                  <li>Limited employee access to user data</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-bold mb-3" style={{ color: 'var(--primary)' }}>
                  7. Your Rights
                </h2>
                <p className="mb-3" style={{ color: 'var(--text-muted)' }}>
                  You have the right to:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4" style={{ color: 'var(--text-muted)' }}>
                  <li>Access your personal data</li>
                  <li>Correct inaccurate data</li>
                  <li>Request deletion of your data</li>
                  <li>Export your data</li>
                  <li>Opt-out of certain data processing</li>
                  <li>Disconnect social media accounts</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-bold mb-3" style={{ color: 'var(--primary)' }}>
                  8. Data Retention
                </h2>
                <p style={{ color: 'var(--text-muted)' }}>
                  We retain your data only as long as necessary to provide our service and comply with legal obligations. 
                  You can request deletion of your account and data at any time.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold mb-3" style={{ color: 'var(--primary)' }}>
                  9. Children's Privacy
                </h2>
                <p style={{ color: 'var(--text-muted)' }}>
                  Our service is not intended for users under 13 years of age. We do not knowingly collect 
                  personal information from children under 13.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold mb-3" style={{ color: 'var(--primary)' }}>
                  10. Changes to This Policy
                </h2>
                <p style={{ color: 'var(--text-muted)' }}>
                  We may update this privacy policy from time to time. We will notify you of any significant 
                  changes by email or through our service.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold mb-3" style={{ color: 'var(--primary)' }}>
                  11. Contact Us
                </h2>
                <p style={{ color: 'var(--text-muted)' }}>
                  If you have questions about this privacy policy or our data practices, please contact us at:
                  <br />
                  <strong>Email:</strong> privacy@prism.app
                </p>
              </section>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}