
import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  Sparkles, TrendingUp, Zap, BarChart3, Calendar, Palette, Lightbulb, ArrowRight, 
  CheckCircle, LogIn, UserPlus, Clock, DollarSign, Users, Target, Brain, Rocket,
  Shield, Layers, Eye, MessageCircle, Repeat, Award, ChevronDown, X, Instagram,
  Youtube, Twitter, Video, ImageIcon, Edit3, Share2, TrendingDown,
  AlertCircle, ThumbsUp, Star, Wand2, FileText, Layout, Send, Flame, Trophy
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);
  const [showFAQ, setShowFAQ] = React.useState({});
  const [isCheckingAuth, setIsCheckingAuth] = React.useState(true);

  React.useEffect(() => {
    const checkAuth = async () => {
      try {
        const isAuth = await base44.auth.isAuthenticated();
        if (isAuth) {
          // User is already logged in, redirect to Dashboard
          window.location.href = createPageUrl("Dashboard");
          return;
        }
        setIsAuthenticated(false);
      } catch (error) {
        setIsAuthenticated(false);
      } finally {
        setIsCheckingAuth(false);
      }
    };
    checkAuth();
  }, []);

  const handleLogin = () => {
    base44.auth.redirectToLogin(createPageUrl("Dashboard"));
  };

  const handleSignup = () => {
    base44.auth.redirectToLogin(createPageUrl("Dashboard"));
  };

  const toggleFAQ = (index) => {
    setShowFAQ(prev => ({ ...prev, [index]: !prev[index] }));
  };

  // Show nothing while checking auth
  if (isCheckingAuth) {
    return null;
  }

  const results = [
    { number: "10x", label: "Faster Content Creation" },
    { number: "6+", label: "Platforms Covered" },
    { number: "100+", label: "Ready-Made Templates" },
    { number: "∞", label: "Viral Ideas Generated" }
  ];

  const beforeAfter = [
    {
      before: "Spending 20+ hours/week on content",
      after: "Creating a week's content in 90 minutes",
      icon: Clock
    },
    {
      before: "Posts getting 200-500 views max",
      after: "Regularly hitting 10K-100K+ views",
      icon: TrendingUp
    },
    {
      before: "Paying $200+/month for 5 different tools",
      after: "One tool, one price, everything included",
      icon: DollarSign
    },
    {
      before: "Stressing about what to post next",
      after: "Content ideas on tap, 24/7",
      icon: Brain
    }
  ];

  const workflow = [
    {
      step: "1",
      icon: Flame,
      title: "Discover What's Trending NOW",
      description: "AI scans Instagram, TikTok, YouTube, and Twitter in real-time. Get viral ideas BEFORE your competitors even know they're trending.",
      highlight: "Real-time trend analysis"
    },
    {
      step: "2",
      icon: Wand2,
      title: "Generate Content That HOOKS",
      description: "AI writes scroll-stopping captions, viral scripts, and engagement-driving copy in YOUR brand voice. No more writer's block.",
      highlight: "Zero to polished in seconds"
    },
    {
      step: "3",
      icon: Palette,
      title: "Design Like a Pro (No Skills Needed)",
      description: "Drag, drop, done. Built-in editor with 100+ templates pre-loaded with YOUR brand colors and fonts. Canva who?",
      highlight: "Professional designs, instantly"
    },
    {
      step: "4",
      icon: Rocket,
      title: "Launch Across Every Platform",
      description: "One click = Instagram feed, stories, reels, TikTok, YouTube, Twitter, all posted. Perfectly formatted. Perfectly timed.",
      highlight: "Set it and forget it"
    }
  ];

  const painPoints = [
    {
      pain: "\"I spend HOURS creating content and it flops...\"",
      solution: "Get AI-validated viral predictions BEFORE you post",
      icon: TrendingDown
    },
    {
      pain: "\"I'm always out of ideas by Wednesday...\"",
      solution: "Unlimited trending ideas, personalized daily",
      icon: Brain
    },
    {
      pain: "\"Canva, ChatGPT, Later... I'm juggling too much...\"",
      solution: "Everything in ONE place. One login. Done.",
      icon: Layers
    },
    {
      pain: "\"My content looks nothing like my brand...\"",
      solution: "YOUR colors, YOUR fonts, YOUR voice—automatically",
      icon: Target
    },
    {
      pain: "\"Creating for 5 platforms takes my entire day...\"",
      solution: "Create once, publish everywhere in 60 seconds",
      icon: Clock
    },
    {
      pain: "\"I can't afford a designer, copywriter, AND scheduler...\"",
      solution: "All three + more for less than one Starbucks a day",
      icon: DollarSign
    }
  ];

  const socialProof = [
    {
      name: "Sarah Martinez",
      role: "Fitness Coach • 125K followers",
      content: "I was drowning in content creation. PRISM cut my time from 20 hours to 2 hours per week. My engagement is up 340%. This is insane.",
      metric: "340% engagement increase",
      avatar: "💪",
      stars: 5
    },
    {
      name: "James Liu",
      role: "E-commerce Brand • $2M revenue",
      content: "We fired our agency and switched to PRISM. Saved $5K/month and our content performs BETTER. The ROI is ridiculous.",
      metric: "$60K saved annually",
      avatar: "🛍️",
      stars: 5
    },
    {
      name: "Mia Rodriguez",
      role: "Content Creator • 850K TikTok",
      content: "The native editor is a game-changer. I don't need Canva, Photoshop, nothing. Everything's right there. My workflow is 10x smoother.",
      metric: "10x faster workflow",
      avatar: "🎬",
      stars: 5
    }
  ];

  const faqs = [
    {
      question: "How is this different from ChatGPT + Canva + Later?",
      answer: "PRISM is purpose-built for viral social media content. ChatGPT gives generic ideas, Canva requires manual design, and Later is just scheduling. PRISM does ALL of it—idea generation based on real-time trends, content development in YOUR voice, visual design with YOUR brand assets, and multi-platform publishing—in ONE seamless workflow. Plus, it's cheaper than paying for all three separately."
    },
    {
      question: "Will the AI content actually sound like MY brand?",
      answer: "Yes! PRISM learns YOUR brand voice, values, and tone. You set it up once (takes 5 minutes), and every piece of content matches your style. The AI gets smarter with every edit you make. Within a week, it's writing content that sounds like you wrote it yourself."
    },
    {
      question: "I'm not a designer. Can I really create professional visuals?",
      answer: "Absolutely. PRISM is built for non-designers. Start with 100+ professional templates, drag-and-drop to customize, and let AI suggest layouts. Your brand colors, fonts, and logos are pre-loaded, so you're always on-brand. If you can use Instagram, you can use PRISM's editor."
    },
    {
      question: "What platforms can I publish to?",
      answer: "Instagram (feed, stories, reels, carousels), TikTok, YouTube (thumbnails, community posts), Twitter/X (posts, threads), Facebook (posts, stories), and LinkedIn (articles, carousels). Each platform gets content automatically optimized for its specific format, dimensions, and best practices."
    },
    {
      question: "How does the viral idea generation work?",
      answer: "PRISM's AI analyzes millions of posts across Instagram, TikTok, YouTube, Twitter, and trending news sources in real-time. It identifies viral patterns, trending hooks, and popular formats—then customizes suggestions specifically for YOUR brand, niche, and audience. You get endless ideas that are timely, relevant, and designed to go viral."
    },
    {
      question: "Can I manage multiple brands or clients?",
      answer: "Yes! Perfect for agencies and multi-brand entrepreneurs. Each brand gets its own voice, visual identity, templates, content calendar, and analytics. Switch between brands instantly. Manage 1 brand or 100—same easy interface."
    },
    {
      question: "What if I need help or have questions?",
      answer: "We've got your back. PRISM includes in-app tutorials, a comprehensive help center, and responsive customer support. Plus, our AI assistant is available 24/7 to answer questions and guide you through any feature."
    },
    {
      question: "Is there a free trial?",
      answer: "Yes! Start creating viral content today—no credit card required. Test drive all features, generate unlimited ideas, create content, and see the results for yourself. Cancel anytime if it's not for you (but we're betting you'll love it)."
    }
  ];

  const CTAButton = ({ className = "", variant = "primary" }) => {
    return (
      <Button 
        onClick={handleSignup}
        size="lg" 
        className={`rounded-xl px-8 py-6 text-lg font-bold shadow-xl hover:shadow-2xl transition-all ${className}`}
        style={{
          background: variant === "primary" 
            ? 'linear-gradient(135deg, #88925D 0%, #A4B58B 100%)'
            : 'white',
          color: variant === "primary" ? 'white' : '#88925D',
          border: variant === "secondary" ? '2px solid #88925D' : 'none'
        }}
      >
        <Rocket className="w-5 h-5 mr-2" />
        Get Started FREE
        <ArrowRight className="w-5 h-5 ml-2" />
      </Button>
    );
  };

  return (
    <div className="min-h-screen" style={{
      background: 'linear-gradient(135deg, #FFE5D9 0%, #FFECD1 20%, #FFF4E0 40%, #E8F4D9 60%, #D9EEF4 80%, #E8D9F4 100%)'
    }}>
      {/* Background Effects */}
      <div className="fixed inset-0 opacity-20 pointer-events-none"
           style={{
             backgroundImage: `
               radial-gradient(circle at 20% 30%, rgba(212, 165, 116, 0.4) 0%, transparent 50%),
               radial-gradient(circle at 80% 70%, rgba(139, 155, 133, 0.4) 0%, transparent 50%)
             `,
             animation: 'pulse 8s ease-in-out infinite'
           }}
      />

      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-16 md:py-24 relative z-10">
          <div className="text-center mb-12">
            <Badge className="mb-6 text-base px-4 py-2 animate-pulse" style={{
              background: 'linear-gradient(135deg, rgba(229, 165, 116, 0.9) 0%, rgba(232, 180, 77, 0.8) 100%)',
              color: '#3D3D2B'
            }}>
              <Flame className="w-4 h-4 mr-2" />
              10,000+ Creators Making Viral Content Daily
            </Badge>

            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 px-4" style={{ 
              color: '#3D3D2B',
              lineHeight: '1.1'
            }}>
              Stop Guessing.<br />
              <span style={{ 
                background: 'linear-gradient(135deg, #D4A574 0%, #88925D 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>Start Growing.</span>
            </h1>

            <p className="text-xl md:text-2xl mb-8 max-w-4xl mx-auto px-4 font-semibold" style={{ color: '#5E4032' }}>
              From "what should I post?" to viral content across 6+ platforms—in under 60 seconds. AI-powered. Brand-perfect. Engagement-boosting. Viral-OPTIMIZED.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center px-4 mb-8">
              <CTAButton />
              <Button 
                onClick={handleLogin}
                size="lg"
                variant="outline" 
                className="rounded-xl px-8 py-6 text-lg font-semibold border-2"
                style={{ borderColor: 'rgba(136, 146, 93, 0.4)' }}
              >
                <LogIn className="w-5 h-5 mr-2" />
                Log In
              </Button>
            </div>

            <div className="flex flex-wrap justify-center gap-6 text-sm font-medium" style={{ color: '#8B7355' }}>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5" style={{ color: '#88925D' }} />
                No credit card • Free forever plan
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5" style={{ color: '#88925D' }} />
                Setup in 5 minutes
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5" style={{ color: '#88925D' }} />
                Cancel anytime
              </div>
            </div>
          </div>

          {/* Results Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mt-16">
            {results.map((item, idx) => (
              <Card key={idx} className="border-2 rounded-2xl text-center p-6" style={{ borderColor: 'rgba(136, 146, 93, 0.3)' }}>
                <div className="text-4xl md:text-5xl font-bold mb-2" style={{ 
                  background: 'linear-gradient(135deg, #D4A574 0%, #88925D 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent'
                }}>
                  {item.number}
                </div>
                <div className="text-sm font-semibold" style={{ color: '#6B6B4D' }}>
                  {item.label}
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Before/After Section */}
      <div className="bg-gradient-to-br from-[#3D3D2B] to-[#5E4032] py-16 md:py-24">
        <div className="max-w-6xl mx-auto px-4 md:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-5xl font-bold mb-4 text-white">
              The PRISM Effect
            </h2>
            <p className="text-xl text-white/80">
              See the transformation creators experience in their first month
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {beforeAfter.map((item, idx) => {
              const Icon = item.icon;
              return (
                <Card key={idx} className="border-0 rounded-2xl overflow-hidden">
                  <CardContent className="p-0">
                    <div className="bg-red-50 p-6 border-b-2 border-red-200">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-red-200">
                          <X className="w-5 h-5 text-red-600" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-red-600 mb-1">BEFORE</p>
                          <p className="font-semibold text-red-900">{item.before}</p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-green-50 p-6">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-green-200">
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-green-600 mb-1">AFTER PRISM</p>
                          <p className="font-semibold text-green-900">{item.after}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="text-center mt-12">
            <CTAButton variant="secondary" />
          </div>
        </div>
      </div>

      {/* Workflow Section */}
      <div className="py-16 md:py-24 relative z-10">
        <div className="max-w-6xl mx-auto px-4 md:px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4" style={{ color: '#3D3D2B' }}>
              Viral in 4 Ridiculously Simple Steps
            </h2>
            <p className="text-xl max-w-3xl mx-auto" style={{ color: '#6B6B4D' }}>
              From blank screen to viral sensation—faster than brewing your morning coffee
            </p>
          </div>

          <div className="grid gap-8">
            {workflow.map((item, idx) => {
              const Icon = item.icon;
              return (
                <Card key={idx} className="border-2 rounded-3xl hover:shadow-2xl transition-all group" style={{ borderColor: 'rgba(180, 150, 120, 0.3)' }}>
                  <CardContent className="p-8 md:p-10">
                    <div className="grid md:grid-cols-[auto_1fr] gap-6">
                      <div className="relative">
                        <div className="w-20 h-20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform" style={{ 
                          background: 'linear-gradient(135deg, #88925D 0%, #A4B58B 100%)',
                          boxShadow: '0 8px 24px rgba(136, 146, 93, 0.3)'
                        }}>
                          <Icon className="w-10 h-10 text-white" />
                        </div>
                        <div className="absolute -top-3 -right-3 w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold text-white" style={{
                          background: 'linear-gradient(135deg, #E8B44D 0%, #E5A574 100%)'
                        }}>
                          {item.step}
                        </div>
                      </div>
                      <div>
                        <Badge className="mb-3" style={{ background: 'rgba(136, 146, 93, 0.15)', color: '#88925D' }}>
                          {item.highlight}
                        </Badge>
                        <h3 className="text-2xl md:text-3xl font-bold mb-3" style={{ color: '#3D3D2B' }}>
                          {item.title}
                        </h3>
                        <p className="text-lg leading-relaxed" style={{ color: '#6B6B4D' }}>
                          {item.description}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="text-center mt-12">
            <CTAButton />
            <p className="mt-4 text-sm font-semibold" style={{ color: '#8B7355' }}>
              ⚡ First viral post created in under 5 minutes (we timed it)
            </p>
          </div>
        </div>
      </div>

      {/* Pain Points Section */}
      <div className="bg-white/50 py-16 md:py-24">
        <div className="max-w-6xl mx-auto px-4 md:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-5xl font-bold mb-4" style={{ color: '#3D3D2B' }}>
              Sound Familiar?
            </h2>
            <p className="text-xl max-w-3xl mx-auto" style={{ color: '#6B6B4D' }}>
              These are the exact problems PRISM was built to destroy
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {painPoints.map((item, idx) => {
              const Icon = item.icon;
              return (
                <Card key={idx} className="border-2 rounded-2xl hover:shadow-xl transition-all" style={{ borderColor: 'rgba(180, 150, 120, 0.3)' }}>
                  <CardContent className="p-6">
                    <div className="flex items-start gap-3 mb-4">
                      <Icon className="w-6 h-6 flex-shrink-0 text-red-500" />
                      <p className="font-bold text-red-600 italic">
                        {item.pain}
                      </p>
                    </div>
                    <div className="flex items-start gap-3 pt-4 border-t" style={{ borderColor: 'rgba(136, 146, 93, 0.2)' }}>
                      <CheckCircle className="w-6 h-6 flex-shrink-0" style={{ color: '#88925D' }} />
                      <p className="font-bold" style={{ color: '#88925D' }}>
                        {item.solution}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="text-center mt-12">
            <div className="inline-flex items-center gap-3 px-6 py-4 rounded-2xl mb-6" style={{
              background: 'linear-gradient(135deg, rgba(232, 180, 77, 0.2) 0%, rgba(229, 165, 116, 0.2) 100%)',
              border: '2px solid rgba(232, 180, 77, 0.4)'
            }}>
              <Trophy className="w-8 h-8" style={{ color: '#E8B44D' }} />
              <div className="text-left">
                <p className="font-bold" style={{ color: '#3D3D2B' }}>Stop struggling. Start winning.</p>
                <p className="text-sm" style={{ color: '#6B6B4D' }}>Join 10,000+ creators already crushing it</p>
              </div>
            </div>
            <div>
              <CTAButton />
            </div>
          </div>
        </div>
      </div>

      {/* Social Proof */}
      <div className="py-16 md:py-24">
        <div className="max-w-6xl mx-auto px-4 md:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-5xl font-bold mb-4" style={{ color: '#3D3D2B' }}>
              Real Creators. Real Results. Real Talk.
            </h2>
            <p className="text-xl" style={{ color: '#6B6B4D' }}>
              Here's what happened when they switched to PRISM
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {socialProof.map((proof, idx) => (
              <Card key={idx} className="border-2 rounded-2xl hover:shadow-xl transition-all" style={{ borderColor: 'rgba(180, 150, 120, 0.3)' }}>
                <CardContent className="p-6">
                  <div className="flex gap-1 mb-3">
                    {[...Array(proof.stars)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 fill-current" style={{ color: '#F59E0B' }} />
                    ))}
                  </div>
                  <p className="mb-4 italic font-medium" style={{ color: '#5E4032' }}>
                    "{proof.content}"
                  </p>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center text-2xl" style={{ backgroundColor: 'rgba(136, 146, 93, 0.15)' }}>
                      {proof.avatar}
                    </div>
                    <div>
                      <p className="font-bold" style={{ color: '#3D3D2B' }}>{proof.name}</p>
                      <p className="text-sm" style={{ color: '#8B7355' }}>{proof.role}</p>
                    </div>
                  </div>
                  <Badge className="font-bold" style={{ background: 'linear-gradient(135deg, #88925D 0%, #A4B58B 100%)', color: 'white' }}>
                    {proof.metric}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="text-center mt-12">
            <CTAButton />
            <p className="mt-4 text-sm font-semibold" style={{ color: '#8B7355' }}>
              ⭐ Trusted by 10,000+ creators worldwide
            </p>
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="bg-white/50 py-16 md:py-24">
        <div className="max-w-4xl mx-auto px-4 md:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-5xl font-bold mb-4" style={{ color: '#3D3D2B' }}>
              Questions? We've Got Answers.
            </h2>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <Card key={idx} className="border-2 rounded-2xl overflow-hidden" style={{ borderColor: 'rgba(180, 150, 120, 0.3)' }}>
                <button
                  onClick={() => toggleFAQ(idx)}
                  className="w-full p-6 text-left flex items-center justify-between hover:bg-gray-50/50 transition-colors"
                >
                  <h3 className="font-bold text-lg pr-4" style={{ color: '#3D3D2B' }}>
                    {faq.question}
                  </h3>
                  <ChevronDown 
                    className={`w-6 h-6 flex-shrink-0 transition-transform ${showFAQ[idx] ? 'rotate-180' : ''}`}
                    style={{ color: '#88925D' }}
                  />
                </button>
                {showFAQ[idx] && (
                  <div className="px-6 pb-6 pt-0">
                    <p className="text-base leading-relaxed" style={{ color: '#5E4032' }}>
                      {faq.answer}
                    </p>
                  </div>
                )}
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Final CTA */}
      <div className="bg-gradient-to-br from-[#88925D] to-[#A4B58B] py-20 md:py-32">
        <div className="max-w-4xl mx-auto px-4 md:px-6 text-center">
          <h2 className="text-4xl md:text-6xl font-bold mb-6 text-white">
            Your Next Viral Post Is 60 Seconds Away
          </h2>
          <p className="text-xl md:text-2xl mb-10 text-white/90">
            Stop overthinking. Stop overpaying. Stop underperforming. Start going viral with PRISM.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <Button 
              onClick={handleSignup}
              size="lg" 
              className="rounded-xl px-10 py-7 text-xl font-bold shadow-2xl hover:shadow-3xl transition-all bg-white hover:bg-gray-50"
              style={{ color: '#88925D' }}
            >
              <Rocket className="w-6 h-6 mr-2" />
              Start FREE Now
              <ArrowRight className="w-6 h-6 ml-2" />
            </Button>
            <Button 
              onClick={handleLogin}
              size="lg"
              variant="outline" 
              className="rounded-xl px-10 py-7 text-xl font-bold border-2 border-white text-white hover:bg-white/10"
            >
              <LogIn className="w-6 h-6 mr-2" />
              Login
            </Button>
          </div>

          <div className="flex flex-wrap justify-center gap-6 text-white/80 font-semibold">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              Free forever plan available
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              No credit card required
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              Setup in 5 minutes
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-white/30 py-8 text-center">
        <div className="max-w-6xl mx-auto px-4 md:px-6">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{
              background: 'linear-gradient(135deg, #E8B44D 0%, #E5A574 100%)'
            }}>
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-xl" style={{ color: '#3D3D2B' }}>PRISM</span>
          </div>
          <p className="text-sm mb-4" style={{ color: '#8B7355' }}>
            The viral content engine for creators who refuse to stay stuck
          </p>
          <div className="flex flex-wrap justify-center gap-6 text-sm">
            <Link to={createPageUrl("Privacy")} className="hover:underline" style={{ color: '#6B6B4D' }}>
              Privacy Policy
            </Link>
            <Link to={createPageUrl("Terms")} className="hover:underline" style={{ color: '#6B6B4D' }}>
              Terms of Service
            </Link>
          </div>
          <p className="text-xs mt-6" style={{ color: '#8B7355' }}>
            © 2024 PRISM. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
