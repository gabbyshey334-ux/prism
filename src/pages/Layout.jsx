

import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Sparkles, LayoutDashboard, Settings, User, Calendar, ListOrdered, TrendingUp, FileText } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { prism } from "@/api/prismClient";
import { auth as firebaseAuth } from "@/lib/firebaseClient";

const navigationItems = [
  {
    title: "Dashboard",
    url: createPageUrl("Dashboard"),
    icon: LayoutDashboard,
  },
  {
    title: "Trends",
    url: createPageUrl("Trends"),
    icon: TrendingUp,
  },
  {
    title: "Generate", // New page for content generation
    url: createPageUrl("Generate"),
    icon: Sparkles, // Using Sparkles as it implies creation/AI
  },
  {
    title: "Library",
    url: createPageUrl("Library"),
    icon: LayoutDashboard, // Reusing LayoutDashboard, as no new icon specified
  },
  {
    title: "Schedule",
    url: createPageUrl("Schedule"),
    icon: Calendar,
  },
  {
    title: "Autolist",
    url: createPageUrl("Autolist"),
    icon: ListOrdered,
  },
  {
    title: "Posts",
    url: createPageUrl("Posts"),
    icon: FileText,
  },
  {
    title: "Brands",
    url: createPageUrl("Brands"),
    icon: User,
  },
  {
    title: "Settings",
    url: createPageUrl("Settings"),
    icon: Settings,
  },
];

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const [userInfo, setUserInfo] = useState(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const u = await prism.auth.getCurrentUser();
        if (mounted && u) setUserInfo({ name: u.name || u.displayName, email: u.email });
      } catch {}
      const fu = firebaseAuth.currentUser;
      if (mounted && fu) setUserInfo({ name: fu.displayName, email: fu.email });
    };
    load();
    const unsub = firebaseAuth.onAuthStateChanged?.((u) => {
      if (u) setUserInfo({ name: u.displayName, email: u.email });
    });
    return () => {
      mounted = false;
      if (typeof unsub === 'function') unsub();
    };
  }, []);

  const hideShell = location.pathname === '/' || location.pathname.toLowerCase() === '/home' || location.pathname.toLowerCase() === '/login';

  return (
    <>
      <style>{`
        :root {
          --background: linear-gradient(135deg, #FDE7E7 0%, #FAE9DC 20%, #FCEFE6 40%, #EBF4E5 60%, #E0EFF4 80%, #E7E0F4 100%);
          --background-secondary: #FDF9F7;
          --card: rgba(255, 255, 255, 0.88);
          --card-hover: rgba(224, 122, 95, 0.15); /* Updated */
          --card-border: rgba(125, 90, 74, 0.3); /* Updated */
          --primary: #7D5A4A; /* Updated */
          --primary-light: #A18274; /* Updated */
          --primary-dark: #5E4032; /* Updated */
          --accent: #E07A5F; /* Updated */
          --accent-light: #F7D2C7; /* Updated */
          --accent-dark: #C9664D; /* Updated */
          --accent-yellow: #E8B44D;
          --success: #A8BF8F;
          --text: #333333; /* Updated */
          --text-muted: #8C776D; /* Updated */
          --border: rgba(125, 90, 74, 0.4); /* Updated */
          --viral-high: #E89152;
          --scheduled: #7FB8BF;
          --rainbow-1: #E07A5F; /* Updated to new accent */
          --rainbow-2: #F7D2C7; /* Updated to new accent-light */
          --rainbow-3: #E8B44D;
          --rainbow-4: #A8BF8F;
          --rainbow-5: #7FB8BF;
          --rainbow-6: #A88FA8;
          --glass-bg: rgba(255, 255, 255, 0.75);
          --glass-border: rgba(255, 255, 255, 0.4);
          --glass-shadow: 0 8px 32px 0 rgba(125, 90, 74, 0.15); /* Updated */
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(5deg); }
        }
        
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        
        @keyframes pulse-glow {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.6; }
        }
        
        @keyframes rainbow-shift {
          0% { filter: hue-rotate(0deg); }
          100% { filter: hue-rotate(360deg); }
        }
        
        .glass-card {
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.7) 100%);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.5);
          box-shadow: 
            0 8px 32px 0 var(--glass-shadow), /* Updated */
            inset 0 1px 0 0 rgba(255, 255, 255, 0.8),
            inset 0 -1px 0 0 rgba(224, 122, 95, 0.1); /* Updated */
        }
        
        .glass-sidebar {
          background: linear-gradient(180deg, 
            #FDE7E7 0%, /* Updated */
            #FCEFE6 15%, /* Updated */
            #FDF9F7 30%, /* Updated */
            #EBF4E5 45%, /* Updated */
            #E0EFF4 60%, /* Updated */
            #E7E0F4 75%, /* Updated */
            #F4E5E8 90%, /* Updated */
            #FDE7E7 100% /* Updated */
          );
          border-right: 1px solid var(--border); /* Updated */
          box-shadow: 4px 0 24px rgba(125, 90, 74, 0.3); /* Updated */
        }
        
        .crystal-shine {
          position: relative;
          overflow: hidden;
        }
        
        .crystal-shine::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(
            90deg, 
            transparent, 
            rgba(255, 255, 255, 0.6), 
            transparent
          );
          transition: left 0.6s ease;
        }
        
        .crystal-shine:hover::before {
          left: 100%;
        }
        
        .rainbow-gradient {
          background: linear-gradient(
            135deg,
            var(--rainbow-1) 0%, /* Using variables */
            var(--rainbow-2) 16%, /* Using variables */
            var(--rainbow-3) 33%, /* Using variables */
            var(--rainbow-4) 50%, /* Using variables */
            var(--rainbow-5) 66%, /* Using variables */
            var(--rainbow-6) 83%, /* Using variables */
            var(--accent) 100% /* Using variables */
          );
        }
        
        .ethereal-glow {
          box-shadow: 
            0 0 20px rgba(224, 122, 95, 0.3), /* Updated */
            0 0 40px rgba(140, 160, 170, 0.2), /* Updated */
            inset 0 1px 0 rgba(255, 255, 255, 0.6);
        }
        
        .floating-particle {
          animation: float 6s ease-in-out infinite;
        }
      `}</style>
      <div className="min-h-screen flex w-full relative overflow-hidden" 
           style={{ 
             background: hideShell ? 'white' : 'linear-gradient(135deg, #FDE7E7 0%, #FAE9DC 15%, #FCEFE6 30%, #EBF4E5 45%, #E0EFF4 60%, #E7E0F4 75%, #F4E5E8 90%, #FDE7E7 100%)'
           }}>
        {/* Layered ethereal background effects - HIDDEN for Home/Login/root */}
        {!hideShell && (
          <div className="fixed inset-0 opacity-20 pointer-events-none"
               style={{
                 backgroundImage: `
                   radial-gradient(circle at 20% 30%, rgba(224, 122, 95, 0.4) 0%, transparent 50%), /* Updated */
                   radial-gradient(circle at 80% 70%, rgba(140, 160, 170, 0.4) 0%, transparent 50%), /* Updated */
                   radial-gradient(circle at 50% 50%, rgba(162, 202, 209, 0.3) 0%, transparent 70%) /* Updated */
                 `,
                 animation: 'pulse-glow 8s ease-in-out infinite'
               }}
          />
        )}
        
        {/* Floating rainbow particles - HIDDEN for Home/Login/root */}
        {!hideShell && (
          <>
            <div className="fixed top-20 left-1/4 w-32 h-32 rounded-full opacity-10 floating-particle"
                 style={{
                   background: 'radial-gradient(circle, rgba(224, 122, 95, 0.8) 0%, transparent 70%)', /* Updated */
                   filter: 'blur(20px)'
                 }}
            />
            <div className="fixed bottom-40 right-1/3 w-40 h-40 rounded-full opacity-10 floating-particle"
                 style={{
                   background: 'radial-gradient(circle, rgba(140, 160, 170, 0.8) 0%, transparent 70%)', /* Updated */
                   filter: 'blur(25px)',
                   animationDelay: '2s'
                 }}
            />
            <div className="fixed top-1/2 right-1/4 w-24 h-24 rounded-full opacity-10 floating-particle"
                 style={{
                   background: 'radial-gradient(circle, rgba(162, 202, 209, 0.8) 0%, transparent 70%)', /* Updated */
                   filter: 'blur(15px)',
                   animationDelay: '4s'
                 }}
            />
          </>
        )}
        
        {/* Sidebar - HIDDEN for Home/Login/root */}
        {!hideShell ? (
          <SidebarProvider>
            <div className="flex w-full">
            <Sidebar className="glass-sidebar border-r-0 shadow-2xl">
            <SidebarHeader className="p-5 border-b"
                          style={{ 
                            borderColor: 'var(--border)', /* Updated */
                            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.25) 0%, rgba(224, 122, 95, 0.15) 100%)' /* Updated */
                          }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center crystal-shine ethereal-glow rainbow-gradient" 
                     style={{ 
                       boxShadow: '0 4px 20px rgba(224, 122, 95, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.6)' /* Updated */
                     }}>
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="font-bold text-lg" style={{ 
                    color: 'var(--primary-dark)', /* Updated */
                    textShadow: '0 1px 2px rgba(255, 255, 255, 0.3)'
                  }}>Prism</h2>
                  <p className="text-xs font-medium" style={{ color: 'var(--primary)' }}>Viral Content AI</p> {/* Updated */}
                </div>
              </div>
            </SidebarHeader>
            
            <SidebarContent className="px-3 py-4">
              <SidebarGroup>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {navigationItems.map((item) => (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton 
                          asChild 
                          className="hover:bg-opacity-80 transition-all duration-300 rounded-2xl mb-1.5 crystal-shine relative overflow-hidden"
                          style={{
                            background: location.pathname === item.url 
                              ? 'linear-gradient(135deg, rgba(224, 122, 95, 0.4) 0%, rgba(181, 196, 159, 0.4) 50%, rgba(162, 202, 209, 0.4) 100%)' /* Updated */
                              : 'linear-gradient(135deg, rgba(255, 255, 255, 0.3) 0%, rgba(255, 255, 255, 0.1) 100%)',
                            color: location.pathname === item.url ? 'var(--text)' : 'var(--text-muted)', /* Updated */
                            boxShadow: location.pathname === item.url 
                              ? '0 4px 20px rgba(224, 122, 95, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.6), inset 0 -1px 0 rgba(224, 122, 95, 0.3)' /* Updated */
                              : 'none',
                            border: location.pathname === item.url 
                              ? '1px solid rgba(224, 122, 95, 0.6)' /* Updated */
                              : '1px solid transparent',
                            fontWeight: location.pathname === item.url ? '700' : '500',
                            fontSize: '15px',
                            backdropFilter: location.pathname === item.url ? 'blur(12px)' : 'blur(8px)'
                          }}
                        >
                          <Link to={item.url} className="flex items-center gap-3 px-4 py-3">
                            <item.icon className="w-5 h-5" />
                            <span>{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>

            <SidebarFooter className="p-4 mt-auto border-t" style={{ 
              borderColor: 'var(--border)', /* Updated */
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.25) 0%, rgba(224, 122, 95, 0.15) 100%)' /* Updated */
            }}>
              <div className="flex items-center gap-3 px-2">
                <div className="w-9 h-9 rounded-full flex items-center justify-center crystal-shine ethereal-glow rainbow-gradient" 
                     style={{ 
                       boxShadow: '0 4px 16px rgba(224, 122, 95, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.5)' /* Updated */
                     }}>
                  <User className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate" style={{ 
                    color: 'var(--primary-dark)', 
                    textShadow: '0 1px 2px rgba(255, 255, 255, 0.3)'
                  }}>{userInfo?.name || userInfo?.email || 'Signed Out'}</p>
                  <p className="text-xs truncate" style={{ color: 'var(--primary)' }}>{userInfo ? 'Signed In' : 'Guest'}</p>
                </div>
              </div>
            </SidebarFooter>
          </Sidebar>
          <div className="flex-1 p-4 md:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">
              {children}
            </div>
          </div>
          </div>
          </SidebarProvider>
        ) : (
          <div className="flex-1">
            {/* TikTok/Facebook OAuth fallback */}
            <script dangerouslySetInnerHTML={{
            __html: `
            (() => {
            const p = new URLSearchParams(location.search);
            const c = p.get('code');
            if ((p.get('tiktok') === '1' || p.get('facebook') === '1') && c) {
                fetch('/functions/socialMediaCallback?' + p.toString())
                .then(r => r.text())
                .then(() => location.href = '/dashboard');
            }
            })()`
            }} />
            {children}
          </div>
        )}
      </div>
    </>
  );
}

