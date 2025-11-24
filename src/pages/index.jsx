import Layout from "./Layout.jsx";

import Dashboard from "./Dashboard";
import Settings from "./Settings";
import Brands from "./Brands";
import Schedule from "./Schedule";
import Autolist from "./Autolist";
import Trends from "./Trends";
import Library from "./Library";
import Generate from "./Generate";
import Templates from "./Templates";
import TestEditor from "./TestEditor";
import Analytics from "./Analytics";
import Uploads from "./Uploads";
import Connections from "./Connections";
import Privacy from "./Privacy";
import DataDeletion from "./DataDeletion";
import Terms from "./Terms";
import Brainstorm from "./Brainstorm";
import Home from "./Home";
import Login from "./Login";
import Posts from "./Posts";
import { prism } from "@/api/prismClient";
import { Navigate } from 'react-router-dom';

import TestCallbackPage from "./test-callback";
import OAuthCallbackPage from "./oauth-callback";
import FacebookCallbackPage from "./facebook-callback";
import TikTokCallbackPage from "./tiktok-callback";
import LinkedInCallbackPage from "./linkedin-callback";
import YouTubeCallbackPage from "./youtube-callback";
import TestOAuthPage from "./test-oauth";

import TestOAuth from "./TestOAuth";
import FacebookCallback from "./FacebookCallback";
import TikTokCallback from "./TikTokCallback";
import LinkedInCallback from "./LinkedInCallback";

import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';

const PAGES = {
    Dashboard: Dashboard,
    Settings: Settings,
    Brands: Brands,
    Schedule: Schedule,
    Autolist: Autolist,
    Posts: Posts,
    Trends: Trends,
    Library: Library,
    Generate: Generate,
    Templates: Templates,
    TestEditor: TestEditor,
    Analytics: Analytics,
    Uploads: Uploads,
    Connections: Connections,
    Privacy: Privacy,
    DataDeletion: DataDeletion,
    Terms: Terms,
    Brainstorm: Brainstorm,
    Home: Home,

    "test-callback": TestCallbackPage,
    "oauth-callback": OAuthCallbackPage,
    "facebook-callback": FacebookCallbackPage,
    "tiktok-callback": TikTokCallbackPage,
    "linkedin-callback": LinkedInCallbackPage,
    "youtube-callback": YouTubeCallbackPage,
    "test-oauth": TestOAuthPage,

    TestOAuth: TestOAuth,
    FacebookCallback: FacebookCallback,
    TikTokCallback: TikTokCallback,
    LinkedInCallback: LinkedInCallback,
};

function _getCurrentPage(url) {
    if (url.endsWith('/')) {
        url = url.slice(0, -1);
    }
    let urlLastPart = url.split('/').pop();
    if (urlLastPart.includes('?')) {
        urlLastPart = urlLastPart.split('?')[0];
    }

    const pageName = Object.keys(PAGES).find(page => page.toLowerCase() === urlLastPart.toLowerCase());
    return pageName || Object.keys(PAGES)[0];
}

function PagesContent() {
  const location = useLocation();
  const currentPage = _getCurrentPage(location.pathname);

  const RootRoute = () => {
    const isAuth = prism.auth.isAuthenticated();
    return isAuth ? <Navigate to="/dashboard" replace /> : <Home />;
  };

  const RequireAuth = ({ children }) => {
    const isAuth = prism.auth.isAuthenticated();
    if (!isAuth) {
      if (typeof window !== 'undefined') {
        localStorage.setItem('redirect_after_login', window.location.pathname);
      }
      return <Navigate to="/login" replace />;
    }
    return children;
  };

    return (
        <Layout currentPageName={currentPage}>
          <Routes>
            <Route path="/" element={<RootRoute />} />
            <Route path="/login" element={<Login />} />
            <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
            <Route path="/settings" element={<RequireAuth><Settings /></RequireAuth>} />
            <Route path="/brands" element={<RequireAuth><Brands /></RequireAuth>} />
            <Route path="/schedule" element={<RequireAuth><Schedule /></RequireAuth>} />
            <Route path="/autolist" element={<RequireAuth><Autolist /></RequireAuth>} />
            <Route path="/posts" element={<RequireAuth><Posts /></RequireAuth>} />
            <Route path="/trends" element={<RequireAuth><Trends /></RequireAuth>} />
            <Route path="/library" element={<RequireAuth><Library /></RequireAuth>} />
            <Route path="/generate" element={<RequireAuth><Generate /></RequireAuth>} />
            <Route path="/templates" element={<RequireAuth><Templates /></RequireAuth>} />
            <Route path="/testeditor" element={<RequireAuth><TestEditor /></RequireAuth>} />
            <Route path="/analytics" element={<RequireAuth><Analytics /></RequireAuth>} />
            <Route path="/uploads" element={<RequireAuth><Uploads /></RequireAuth>} />
            <Route path="/connections" element={<RequireAuth><Connections /></RequireAuth>} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/datadeletion" element={<DataDeletion />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/home" element={<Home />} />

                <Route path="/test-callback" element={<TestCallbackPage />} />
                <Route path="/oauth-callback" element={<OAuthCallbackPage />} />
                <Route path="/facebook-callback" element={<FacebookCallbackPage />} />
                <Route path="/tiktok-callback" element={<TikTokCallbackPage />} />
                <Route path="/linkedin-callback" element={<LinkedInCallbackPage />} />
                <Route path="/youtube-callback" element={<YouTubeCallbackPage />} />
                <Route path="/test-oauth" element={<TestOAuthPage />} />

                <Route path="/testoauth" element={<TestOAuth />} />
                <Route path="/facebookcallback" element={<FacebookCallback />} />
                <Route path="/tiktokcallback" element={<TikTokCallback />} />
                <Route path="/linkedincallback" element={<LinkedInCallback />} />
            </Routes>
        </Layout>
    );
}

export default function Pages() {
    return (
        <Router>
            <PagesContent />
        </Router>
    );
}