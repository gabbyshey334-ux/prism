import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, Mail } from "lucide-react";

export default function DataDeletion() {
  return (
    <div className="min-h-screen p-6 md:p-8" style={{ backgroundColor: 'var(--background)' }}>
      <div className="max-w-4xl mx-auto">
        <Card className="border-0 rounded-2xl shadow-sm" style={{ backgroundColor: 'var(--card)' }}>
          <CardContent className="p-8 md:p-12">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--accent-light)' }}>
                <Trash2 className="w-6 h-6" style={{ color: 'var(--primary)' }} />
              </div>
              <h1 className="text-4xl font-bold" style={{ color: 'var(--text)' }}>
                Data Deletion Instructions
              </h1>
            </div>
            <p className="text-sm mb-8" style={{ color: 'var(--text-muted)' }}>
              How to request deletion of your data from Prism
            </p>

            <div className="space-y-6 text-base leading-relaxed">
              <section>
                <h2 className="text-2xl font-bold mb-3" style={{ color: 'var(--primary)' }}>
                  Automatic Data Deletion (In-App)
                </h2>
                <p className="mb-4" style={{ color: 'var(--text-muted)' }}>
                  You can delete your data directly from within the Prism app:
                </p>
                <ol className="list-decimal list-inside space-y-2 ml-4" style={{ color: 'var(--text-muted)' }}>
                  <li>Log in to your Prism account</li>
                  <li>Go to <strong>Settings</strong></li>
                  <li>Scroll to the <strong>Account Management</strong> section</li>
                  <li>Click <strong>"Delete Account"</strong></li>
                  <li>Confirm your choice</li>
                </ol>
                <p className="mt-4" style={{ color: 'var(--text-muted)' }}>
                  This will permanently delete:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4 mt-2" style={{ color: 'var(--text-muted)' }}>
                  <li>Your account and profile information</li>
                  <li>All content ideas and generated content</li>
                  <li>Brand settings and preferences</li>
                  <li>Social media connection tokens</li>
                  <li>Analytics and usage data</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-bold mb-3" style={{ color: 'var(--primary)' }}>
                  Manual Data Deletion Request
                </h2>
                <p className="mb-4" style={{ color: 'var(--text-muted)' }}>
                  If you prefer to request data deletion via email or cannot access your account:
                </p>
                <div className="p-6 rounded-xl" style={{ backgroundColor: 'var(--background-secondary)', border: '1px solid var(--border)' }}>
                  <p className="font-semibold mb-3" style={{ color: 'var(--text)' }}>
                    Send an email to:
                  </p>
                  <a 
                    href="mailto:privacy@prism.app?subject=Data Deletion Request"
                    className="inline-flex items-center gap-2 text-lg font-bold hover:opacity-80 transition-opacity"
                    style={{ color: 'var(--primary)' }}
                  >
                    <Mail className="w-5 h-5" />
                    privacy@prism.app
                  </a>
                  <p className="mt-4 text-sm" style={{ color: 'var(--text-muted)' }}>
                    <strong>Subject:</strong> Data Deletion Request
                  </p>
                  <p className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>
                    <strong>Include:</strong>
                  </p>
                  <ul className="list-disc list-inside space-y-1 ml-4 mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>
                    <li>Your full name</li>
                    <li>Email address associated with your account</li>
                    <li>Any usernames or identifiers you used in the app</li>
                    <li>Confirmation that you want all your data deleted</li>
                  </ul>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-bold mb-3" style={{ color: 'var(--primary)' }}>
                  Disconnecting Social Media Accounts
                </h2>
                <p className="mb-4" style={{ color: 'var(--text-muted)' }}>
                  To disconnect and delete social media connection data:
                </p>
                <ol className="list-decimal list-inside space-y-2 ml-4" style={{ color: 'var(--text-muted)' }}>
                  <li>Go to <strong>Connections</strong> page in Prism</li>
                  <li>Click <strong>"Disconnect"</strong> on any connected account</li>
                  <li>Your access tokens will be immediately deleted from our servers</li>
                </ol>
                <p className="mt-4 p-4 rounded-lg" style={{ backgroundColor: 'var(--accent-light)', color: 'var(--text)' }}>
                  <strong>Note:</strong> You should also revoke Prism's access directly from the social media platform:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4 mt-3" style={{ color: 'var(--text-muted)' }}>
                  <li><strong>Facebook/Instagram:</strong> Go to Settings → Security → Apps and Websites → Remove Prism</li>
                  <li><strong>TikTok:</strong> Go to Settings → Security → Authorized Apps → Remove Prism</li>
                  <li><strong>Twitter:</strong> Go to Settings → Security → Apps and Sessions → Remove Prism</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-bold mb-3" style={{ color: 'var(--primary)' }}>
                  Processing Timeline
                </h2>
                <div className="space-y-3" style={{ color: 'var(--text-muted)' }}>
                  <p>
                    <strong>In-App Deletion:</strong> Your data is deleted immediately and permanently.
                  </p>
                  <p>
                    <strong>Email Requests:</strong> We will process your request within 30 days and confirm via email once complete.
                  </p>
                  <p>
                    <strong>Backup Systems:</strong> Data may remain in backup systems for up to 90 days for disaster recovery purposes, after which it is permanently deleted.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-bold mb-3" style={{ color: 'var(--primary)' }}>
                  What Gets Deleted
                </h2>
                <p className="mb-3" style={{ color: 'var(--text-muted)' }}>
                  When you request data deletion, the following information is permanently removed:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4" style={{ color: 'var(--text-muted)' }}>
                  <li>Personal information (name, email, profile)</li>
                  <li>All content you created or uploaded</li>
                  <li>Brand settings and customizations</li>
                  <li>Social media access tokens</li>
                  <li>Analytics and usage history</li>
                  <li>Scheduled posts and drafts</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-bold mb-3" style={{ color: 'var(--primary)' }}>
                  What We May Retain
                </h2>
                <p className="mb-3" style={{ color: 'var(--text-muted)' }}>
                  We may retain minimal information only when required by law or for legitimate business purposes:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4" style={{ color: 'var(--text-muted)' }}>
                  <li>Transaction records for tax/accounting purposes (anonymized)</li>
                  <li>Records needed for legal disputes or investigations</li>
                  <li>Aggregated, anonymized analytics data</li>
                </ul>
              </section>

              <section className="pt-6 border-t" style={{ borderColor: 'var(--border)' }}>
                <h2 className="text-2xl font-bold mb-3" style={{ color: 'var(--primary)' }}>
                  Questions?
                </h2>
                <p style={{ color: 'var(--text-muted)' }}>
                  If you have any questions about data deletion or need assistance, please contact us:
                </p>
                <Button 
                  className="mt-4 rounded-xl"
                  style={{ backgroundColor: 'var(--primary)', color: 'white' }}
                  onClick={() => window.location.href = 'mailto:privacy@prism.app?subject=Data Deletion Question'}
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Contact Privacy Team
                </Button>
              </section>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}