
import React, { useState } from "react";
import { prism } from "@/api/prismClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Settings, Palette, Link as LinkIcon, Loader2, ArrowLeft, MoreVertical, Edit2, Rss, Search, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import BrandChannelSettings from "@/components/brands/BrandChannelSettings";
import BrandConnections from "@/components/brands/BrandConnections";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

// Dummy components to ensure the file is self-contained and compilable.
// In a real application, these would be in separate files and imported.
const RSSFeedManager = ({ brand, onClose, onUpdate }) => {
  const [rssFeeds, setRssFeeds] = useState(brand.rss_feeds || []);
  const [newFeedUrl, setNewFeedUrl] = useState("");

  const handleAddFeed = () => {
    if (newFeedUrl.trim()) {
      const updatedFeeds = [...rssFeeds, newFeedUrl.trim()];
      setRssFeeds(updatedFeeds);
      setNewFeedUrl("");
      onUpdate({ ...brand, rss_feeds: updatedFeeds });
      toast.success("RSS feed added!");
    }
  };

  const handleRemoveFeed = (index) => {
    const updatedFeeds = rssFeeds.filter((_, i) => i !== index);
    setRssFeeds(updatedFeeds);
    onUpdate({ ...brand, rss_feeds: updatedFeeds });
    toast.success("RSS feed removed!");
  };

  return (
    <Card className="border-2 rounded-3xl" style={{
      borderColor: 'rgba(229, 165, 116, 0.4)',
      background: 'white'
    }}>
      <CardContent className="p-6 space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold">Manage RSS Feeds for {brand.name}</h2>
          <Button variant="outline" onClick={onClose} className="rounded-xl">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </div>
        <div>
          <Label htmlFor="new-rss-feed">Add New RSS Feed URL</Label>
          <div className="flex gap-2 mt-1">
            <Input
              id="new-rss-feed"
              value={newFeedUrl}
              onChange={(e) => setNewFeedUrl(e.target.value)}
              placeholder="https://example.com/feed.xml"
              className="rounded-xl"
            />
            <Button onClick={handleAddFeed} className="rounded-xl" style={{
              background: 'linear-gradient(135deg, #88925D 0%, #A4B58B 100%)',
              color: 'white'
            }}>Add</Button>
          </div>
        </div>
        {rssFeeds.length > 0 && (
          <div>
            <h3 className="font-semibold mb-2">Current RSS Feeds:</h3>
            <ul className="space-y-2">
              {rssFeeds.map((feed, index) => (
                <li key={index} className="flex items-center justify-between p-3 border rounded-xl" style={{ borderColor: 'rgba(229, 165, 116, 0.2)' }}>
                  <span className="text-sm truncate mr-4">{feed}</span>
                  <Button variant="destructive" size="sm" onClick={() => handleRemoveFeed(index)} className="rounded-lg">Remove</Button>
                </li>
              ))}
            </ul>
          </div>
        )}
        {rssFeeds.length === 0 && (
          <p className="text-sm text-gray-500">No RSS feeds configured yet.</p>
        )}
      </CardContent>
    </Card>
  );
};

const SearchTermsManager = ({ brand, onClose, onUpdate }) => {
  const [newsTopics, setNewsTopics] = useState(brand.news_topics || []);
  const [newTopic, setNewTopic] = useState("");

  const handleAddTopic = () => {
    if (newTopic.trim()) {
      const updatedTopics = [...newsTopics, newTopic.trim()];
      setNewsTopics(updatedTopics);
      setNewTopic("");
      onUpdate({ ...brand, news_topics: updatedTopics });
      toast.success("Search term added!");
    }
  };

  const handleRemoveTopic = (index) => {
    const updatedTopics = newsTopics.filter((_, i) => i !== index);
    setNewsTopics(updatedTopics);
    onUpdate({ ...brand, news_topics: updatedTopics });
    toast.success("Search term removed!");
  };

  return (
    <Card className="border-2 rounded-3xl" style={{
      borderColor: 'rgba(229, 165, 116, 0.4)',
      background: 'white'
    }}>
      <CardContent className="p-6 space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold">Manage AI Search Terms for {brand.name}</h2>
          <Button variant="outline" onClick={onClose} className="rounded-xl">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </div>
        <div>
          <Label htmlFor="new-search-term">Add New Search Term/Topic</Label>
          <div className="flex gap-2 mt-1">
            <Input
              id="new-search-term"
              value={newTopic}
              onChange={(e) => setNewTopic(e.target.value)}
              placeholder="e.g., 'sustainable fashion', 'local crafts'"
              className="rounded-xl"
            />
            <Button onClick={handleAddTopic} className="rounded-xl" style={{
              background: 'linear-gradient(135deg, #88925D 0%, #A4B58B 100%)',
              color: 'white'
            }}>Add</Button>
          </div>
        </div>
        {newsTopics.length > 0 && (
          <div>
            <h3 className="font-semibold mb-2">Current Search Terms:</h3>
            <ul className="space-y-2">
              {newsTopics.map((topic, index) => (
                <li key={index} className="flex items-center justify-between p-3 border rounded-xl" style={{ borderColor: 'rgba(229, 165, 116, 0.2)' }}>
                  <span className="text-sm mr-4">{topic}</span>
                  <Button variant="destructive" size="sm" onClick={() => handleRemoveTopic(index)} className="rounded-lg">Remove</Button>
                </li>
              ))}
            </ul>
          </div>
        )}
        {newsTopics.length === 0 && (
          <p className="text-sm text-gray-500">No AI search terms configured yet.</p>
        )}
      </CardContent>
    </Card>
  );
};


export default function BrandsPage() {
  const queryClient = useQueryClient();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [activeTab, setActiveTab] = useState("details");
  const [newBrand, setNewBrand] = useState({
    name: "",
    description: "",
    website_url: "",
    primary_color: "#88925D"
  });

  const [showRSSManager, setShowRSSManager] = useState(false);
  const [showSearchTermsManager, setShowSearchTermsManager] = useState(false);
  const [selectedBrandForRSS, setSelectedBrandForRSS] = useState(null);
  const [selectedBrandForTerms, setSelectedBrandForTerms] = useState(null);

  const { data: brands = [], isLoading } = useQuery({
    queryKey: ['brands'],
    queryFn: () => base44.entities.Brand.list(),
    initialData: [],
  });

  const createBrandMutation = useMutation({
    mutationFn: (data) => base44.entities.Brand.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brands'] });
      setShowCreateDialog(false);
      setNewBrand({ name: "", description: "", website_url: "", primary_color: "#88925D" });
      toast.success("Brand created!");
    },
  });

  const updateBrandMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Brand.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brands'] });
      toast.success("Brand updated!");
    },
  });

  const deleteBrandMutation = useMutation({
    mutationFn: (id) => base44.entities.Brand.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brands'] });
      toast.success("Brand deleted!");
    },
  });

  const handleDeleteBrand = (id) => {
    if (window.confirm("Are you sure you want to delete this brand?")) {
      deleteBrandMutation.mutate(id);
    }
  };

  const handleEditBrand = (brand) => {
    setSelectedBrand(brand);
    setActiveTab("details");
  };

  const tabs = [
    { id: "details", label: "Details", icon: Settings },
    { id: "connections", label: "Connections", icon: LinkIcon },
    { id: "channels", label: "Channel Settings", icon: Palette }
  ];

  if (selectedBrand && !showRSSManager && !showSearchTermsManager) {
    return (
      <div className="min-h-screen" style={{ 
        background: 'linear-gradient(135deg, #FFE5D9 0%, #FFECD1 20%, #FFF4E0 40%, #E8F4D9 60%, #D9EEF4 80%, #E8D9F4 100%)'
      }}>
        <div className="max-w-6xl mx-auto p-6">
          <Button
            variant="outline"
            onClick={() => {
              setSelectedBrand(null);
              setActiveTab("details");
            }}
            className="mb-6 rounded-xl"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Brands
          </Button>

          <Card className="border-2 rounded-3xl mb-6" style={{ 
            borderColor: 'rgba(229, 165, 116, 0.4)',
            background: 'white'
          }}>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                {selectedBrand.primary_color && (
                  <div 
                    className="w-16 h-16 rounded-2xl shadow-lg"
                    style={{ backgroundColor: selectedBrand.primary_color }}
                  />
                )}
                <div>
                  <h1 className="text-3xl font-bold" style={{ color: '#3D3D2B' }}>
                    {selectedBrand.name}
                  </h1>
                  {selectedBrand.description && (
                    <p className="text-base mt-1" style={{ color: '#8B7355' }}>
                      {selectedBrand.description}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabs */}
          <div className="flex gap-2 mb-6 border-b-2 pb-2" style={{ borderColor: 'rgba(229, 165, 116, 0.2)' }}>
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl font-semibold transition-all"
                  style={{
                    background: activeTab === tab.id 
                      ? 'linear-gradient(135deg, #88925D 0%, #A4B58B 100%)'
                      : 'transparent',
                    color: activeTab === tab.id ? 'white' : '#6B6B4D'
                  }}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Tab Content */}
          {activeTab === "details" && (
            <Card className="border-2 rounded-3xl" style={{ 
              borderColor: 'rgba(229, 165, 116, 0.4)',
              background: 'white'
            }}>
              <CardContent className="p-6 space-y-4">
                <div>
                  <Label>Brand Name</Label>
                  <Input
                    value={selectedBrand.name}
                    onChange={(e) => setSelectedBrand({ ...selectedBrand, name: e.target.value })}
                    className="rounded-xl"
                  />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={selectedBrand.description || ""}
                    onChange={(e) => setSelectedBrand({ ...selectedBrand, description: e.target.value })}
                    className="rounded-xl"
                  />
                </div>
                <div>
                  <Label>Website URL</Label>
                  <Input
                    value={selectedBrand.website_url || ""}
                    onChange={(e) => setSelectedBrand({ ...selectedBrand, website_url: e.target.value })}
                    className="rounded-xl"
                  />
                </div>
                <div>
                  <Label>Primary Color</Label>
                  <Input
                    type="color"
                    value={selectedBrand.primary_color || "#88925D"}
                    onChange={(e) => setSelectedBrand({ ...selectedBrand, primary_color: e.target.value })}
                    className="rounded-xl h-12"
                  />
                </div>
                <Button
                  onClick={() => updateBrandMutation.mutate({ 
                    id: selectedBrand.id, 
                    data: selectedBrand 
                  })}
                  className="rounded-xl"
                  style={{
                    background: 'linear-gradient(135deg, #88925D 0%, #A4B58B 100%)',
                    color: 'white'
                  }}
                >
                  Save Changes
                </Button>
              </CardContent>
            </Card>
          )}

          {activeTab === "connections" && (
            <BrandConnections brand={selectedBrand} />
          )}

          {activeTab === "channels" && (
            <BrandChannelSettings brand={selectedBrand} />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 md:p-8" style={{ 
      background: 'linear-gradient(135deg, #FFE5D9 0%, #FFECD1 20%, #FFF4E0 40%, #E8F4D9 60%, #D9EEF4 80%, #E8D9F4 100%)'
    }}>
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold" style={{ color: '#3D3D2B' }}>Brands</h1>
            <p className="text-base" style={{ color: '#8B7355' }}>
              Manage your brands and their social media connections
            </p>
          </div>
          <Button
            onClick={() => setShowCreateDialog(true)}
            className="rounded-xl"
            style={{
              background: 'linear-gradient(135deg, #88925D 0%, #A4B58B 100%)',
              color: 'white'
            }}
          >
            <Plus className="w-5 h-5 mr-2" />
            Create Brand
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#88925D' }} />
          </div>
        ) : brands.length === 0 && !showRSSManager && !showSearchTermsManager ? (
          <Card className="border-2 rounded-3xl" style={{ 
            borderColor: 'rgba(229, 165, 116, 0.4)',
            background: 'white'
          }}>
            <CardContent className="p-12 text-center">
              <p className="text-lg" style={{ color: '#8B7355' }}>
                No brands yet. Create your first brand to get started!
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {!selectedBrand && !showRSSManager && !showSearchTermsManager && (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {brands.map(brand => (
                  <Card
                    key={brand.id}
                    className="border-2 rounded-3xl cursor-pointer transition-all hover:shadow-xl crystal-shine"
                    style={{ 
                      borderColor: 'rgba(229, 165, 116, 0.4)',
                      background: 'linear-gradient(135deg, #FFFFFF 0%, #FFF8F0 100%)'
                    }}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          {brand.primary_color && (
                            <div 
                              className="w-12 h-12 rounded-xl shadow-md"
                              style={{ 
                                backgroundColor: brand.primary_color,
                                border: '2px solid white'
                              }}
                            />
                          )}
                          <div>
                            <h3 className="font-bold text-lg" style={{ color: '#3D3D2B' }}>
                              {brand.name}
                            </h3>
                            {brand.industry && (
                              <p className="text-sm" style={{ color: '#8B7355' }}>
                                {brand.industry}
                              </p>
                            )}
                          </div>
                        </div>
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="rounded-xl">
                              <MoreVertical className="w-5 h-5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditBrand(brand)}>
                              <Edit2 className="w-4 h-4 mr-2" />
                              Edit Brand
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {
                              setSelectedBrand(brand);
                              setActiveTab("channels");
                            }}>
                              <Settings className="w-4 h-4 mr-2" />
                              Channel Settings
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {
                              setSelectedBrandForRSS(brand);
                              setShowRSSManager(true);
                            }}>
                              <Rss className="w-4 h-4 mr-2" />
                              RSS Feeds
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {
                              setSelectedBrandForTerms(brand);
                              setShowSearchTermsManager(true);
                            }}>
                              <Search className="w-4 h-4 mr-2" />
                              Search Terms
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDeleteBrand(brand.id)} className="text-red-600">
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      {brand.description && (
                        <p className="text-sm mb-4" style={{ color: '#8B7355' }}>
                          {brand.description}
                        </p>
                      )}

                      {/* RSS Feeds Preview */}
                      {brand.rss_feeds && brand.rss_feeds.length > 0 && (
                        <div className="flex items-center gap-2 text-sm mb-2" style={{ color: '#88925D' }}>
                          <Rss className="w-4 h-4" />
                          <span>{brand.rss_feeds.length} RSS feeds configured</span>
                        </div>
                      )}

                      {/* Search Terms Preview */}
                      {brand.news_topics && brand.news_topics.length > 0 && (
                        <div className="flex items-center gap-2 text-sm" style={{ color: '#88925D' }}>
                          <Search className="w-4 h-4" />
                          <span>{brand.news_topics.length} topics monitored</span>
                        </div>
                      )}

                      {!brand.rss_feeds?.length && !brand.news_topics?.length && (
                        <Badge variant="outline" style={{ borderColor: 'rgba(229, 165, 116, 0.4)' }}>
                          Click to manage
                        </Badge>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* RSS Feed Manager */}
            {showRSSManager && selectedBrandForRSS && (
              <RSSFeedManager
                brand={selectedBrandForRSS}
                onClose={() => {
                  setShowRSSManager(false);
                  setSelectedBrandForRSS(null);
                }}
                onUpdate={(updatedBrand) => {
                  updateBrandMutation.mutate({
                    id: updatedBrand.id,
                    data: updatedBrand
                  });
                }}
              />
            )}

            {/* Search Terms Manager */}
            {showSearchTermsManager && selectedBrandForTerms && (
              <SearchTermsManager
                brand={selectedBrandForTerms}
                onClose={() => {
                  setShowSearchTermsManager(false);
                  setSelectedBrandForTerms(null);
                }}
                onUpdate={(updatedBrand) => {
                  updateBrandMutation.mutate({
                    id: updatedBrand.id,
                    data: updatedBrand
                  });
                }}
              />
            )}
          </>
        )}

        {/* Create Brand Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="rounded-3xl">
            <DialogHeader>
              <DialogTitle>Create New Brand</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label>Brand Name *</Label>
                <Input
                  value={newBrand.name}
                  onChange={(e) => setNewBrand({ ...newBrand, name: e.target.value })}
                  placeholder="My Brand"
                  className="rounded-xl"
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={newBrand.description}
                  onChange={(e) => setNewBrand({ ...newBrand, description: e.target.value })}
                  placeholder="Brief description of your brand"
                  className="rounded-xl"
                />
              </div>
              <div>
                <Label>Website URL</Label>
                <Input
                  value={newBrand.website_url}
                  onChange={(e) => setNewBrand({ ...newBrand, website_url: e.target.value })}
                  placeholder="https://yourbrand.com"
                  className="rounded-xl"
                />
              </div>
              <div>
                <Label>Primary Color</Label>
                <Input
                  type="color"
                  value={newBrand.primary_color}
                  onChange={(e) => setNewBrand({ ...newBrand, primary_color: e.target.value })}
                  className="rounded-xl h-12"
                />
              </div>
              <Button
                onClick={() => createBrandMutation.mutate(newBrand)}
                disabled={!newBrand.name || createBrandMutation.isPending}
                className="w-full rounded-xl"
                style={{
                  background: 'linear-gradient(135deg, #88925D 0%, #A4B58B 100%)',
                  color: 'white'
                }}
              >
                {createBrandMutation.isPending ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating...</>
                ) : (
                  'Create Brand'
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
