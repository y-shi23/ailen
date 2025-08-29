import { HomeIcon, Star, PenTool } from "lucide-react";
import Index from "./pages/Index.jsx";
import Favorites from "./pages/Favorites.jsx";
import Writing from "./pages/Writing.jsx";
import ArticleEditor from "./pages/ArticleEditor.jsx";

/**
 * Central place for defining the navigation items. Used for navigation components and routing.
 */
export const navItems = [
  {
    title: "Home",
    to: "/",
    icon: <HomeIcon className="h-4 w-4" />,
    page: <Index />,
  },
  {
    title: "Favorites",
    to: "/favorites",
    icon: <Star className="h-4 w-4" />,
    page: <Favorites />,
  },
  {
    title: "Writing",
    to: "/writing",
    icon: <PenTool className="h-4 w-4" />,
    page: <Writing />,
  },
  {
    title: "Article Editor",
    to: "/article/:id",
    icon: <PenTool className="h-4 w-4" />,
    page: <ArticleEditor />,
    hidden: true, // 隐藏在导航栏中，只能通过写作页面访问
  },
];
