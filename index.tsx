import React, { useEffect, useRef, useState, useMemo } from "react";
import { createRoot } from "react-dom/client";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { GoogleGenAI } from "@google/genai";
import { createClient } from "@supabase/supabase-js";

// --- Supabase Config ---
const getEnv = (key: string) => (typeof process !== 'undefined' && process.env ? process.env[key] : '') || '';
const SUPABASE_URL = getEnv('NEXT_PUBLIC_SUPABASE_URL') || 'https://xyzcompany.supabase.co';
const SUPABASE_KEY = getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY') || 'public-anon-key';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// --- Types & Constants ---

type HubType = 'shop' | 'tools' | 'video';
type NavMode = 'cinematic' | 'pilot' | 'directory';

type Review = {
  user: string;
  rating: number;
  comment: string;
  date: string;
};

type Product = {
  id: string;
  hubId: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  rating: number;
  reviews: number;
  description?: string;
  isSecondHand?: boolean;
  seller: string;
  stock: number;
  specs?: Record<string, string>;
  reviewList?: Review[];
};

type Video = {
    id: string;
    title: string;
    description: string;
    embedUrl: string;
    thumbnail: string;
    duration: string;
    views: number;
};

type CartItem = Product & { quantity: number };

type Order = {
  id: string;
  date: string;
  items: CartItem[];
  total: number;
  status: 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled';
};

type User = {
  id: string;
  name: string;
  email: string;
  balance: number;
  wishlist: string[]; 
  orders: Order[];
  isAdmin?: boolean;
};

type HubData = {
  id: string;
  name: string;
  type: HubType;
  radius: number;
  distance: number;
  speed: number;
  color: number;
  description: string;
  icon: string;
  hasRing?: boolean;
  geometryType?: 'sphere' | 'torus' | 'icosahedron';
  bgClass?: string; // CSS class for background image
};

const HUBS: HubData[] = [
  { id: "mobile", name: "Mobile Hub", type: 'shop', radius: 2.0, distance: 20, speed: 0.015, color: 0x4aa3ff, description: "Latest Smartphones & Accessories", icon: "📱", geometryType: 'sphere', bgClass: 'bg-mobile' },
  { id: "laptop", name: "Laptop Hub", type: 'shop', radius: 2.5, distance: 35, speed: 0.012, color: 0xc0c0c0, description: "High-Performance Computing", icon: "💻", geometryType: 'sphere', bgClass: 'bg-laptop' },
  { id: "secondhand", name: "2nd Hand Market", type: 'shop', radius: 3.5, distance: 50, speed: 0.009, color: 0xff8844, description: "Buy, Sell, Exchange Pre-loved Items", icon: "♻️", geometryType: 'sphere', bgClass: 'bg-default' },
  { id: "products", name: "Product Hub", type: 'shop', radius: 2.8, distance: 65, speed: 0.007, color: 0x00ffcc, description: "Tech Gadgets & Essentials", icon: "🎧", geometryType: 'sphere', bgClass: 'bg-tools' },
  { id: "fashion", name: "Fashion Hub", type: 'shop', radius: 3.0, distance: 80, speed: 0.005, color: 0xff66aa, description: "Virtual Try-On & Trends", icon: "👗", geometryType: 'sphere', bgClass: 'bg-fashion' },
  { id: "realstate", name: "Real Estate", type: 'shop', radius: 4.0, distance: 95, speed: 0.004, color: 0x22aa55, hasRing: true, description: "Property & Business Assets", icon: "🏢", geometryType: 'sphere', bgClass: 'bg-mobile' },
  { id: "video", name: "Video Hub", type: 'video', radius: 3.0, distance: 110, speed: 0.003, color: 0x9933ff, description: "Tutorials & Learning", icon: "🎓", geometryType: 'icosahedron', bgClass: 'bg-video' },
  { id: "tools", name: "Tools Hub", type: 'tools', radius: 2.5, distance: 125, speed: 0.002, color: 0x4444ff, description: "16+ AI Utilities Dashboard", icon: "🛠️", geometryType: 'torus', bgClass: 'bg-tools' },
];

const INITIAL_PRODUCTS: Product[] = [
    { id: "m1", hubId: "mobile", name: "iPhone 15 Pro Max (256GB)", price: 185000, originalPrice: 195000, rating: 4.9, reviews: 120, seller: "EvoStore", stock: 15, image: "https://images.unsplash.com/photo-1696446701796-da61225697cc?auto=format&fit=crop&w=300&q=80", description: "Natural Titanium, A17 Pro Chip, the most powerful iPhone." },
    { id: "m2", hubId: "mobile", name: "Samsung Galaxy S24 Ultra", price: 184999, rating: 4.8, reviews: 95, seller: "Samsung Nepal", stock: 20, image: "https://images.unsplash.com/photo-1706606992982-b7e252a92771?auto=format&fit=crop&w=300&q=80", description: "Titanium Grey, Galaxy AI features, S-Pen included." },
    { id: "m3", hubId: "mobile", name: "Redmi Note 13 Pro+ 5G", price: 47999, rating: 4.6, reviews: 300, seller: "Daraz Mall", stock: 50, image: "https://images.unsplash.com/photo-1707831839230-22c7d97793d2?auto=format&fit=crop&w=300&q=80", description: "200MP Camera, 120W HyperCharge, Curved Display." },
    { id: "m4", hubId: "mobile", name: "OnePlus 12 (16/512GB)", price: 139999, rating: 4.7, reviews: 45, seller: "Kratos Tech", stock: 10, image: "https://images.unsplash.com/photo-1678957949479-b1e876a38210?auto=format&fit=crop&w=300&q=80", description: "Snapdragon 8 Gen 3, Hasselblad Camera, 100W Charging." },
    { id: "l1", hubId: "laptop", name: "Acer Nitro V 15 (2024)", price: 105000, originalPrice: 115000, rating: 4.7, reviews: 200, seller: "ITTI Computer", stock: 25, image: "https://images.unsplash.com/photo-1603302576837-37561b2e2302?auto=format&fit=crop&w=300&q=80", description: "i5-13th Gen, RTX 4050 6GB, 144Hz, Best Budget Gaming Laptop." },
    { id: "l2", hubId: "laptop", name: "Lenovo LOQ 15", price: 112000, rating: 4.8, reviews: 150, seller: "Megatech", stock: 15, image: "https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?auto=format&fit=crop&w=300&q=80", description: "Ryzen 7 7840HS, RTX 4060, The new budget king." },
    { id: "s1", hubId: "secondhand", name: "Royal Enfield Classic 350", price: 350000, rating: 4.5, reviews: 5, seller: "Suresh Bikers", stock: 1, isSecondHand: true, image: "https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=300&q=80", description: "2019 Model, Gunmetal Grey, Lot 85, Fresh Condition." },
    { id: "s2", hubId: "secondhand", name: "Hyundai Grand i10 (2016)", price: 1850000, rating: 4.2, reviews: 2, seller: "Kathmandu Recondition", stock: 1, isSecondHand: true, image: "https://images.unsplash.com/photo-1599321303867-047b4b3c02eb?auto=format&fit=crop&w=300&q=80", description: "Single Hand, Magna Variant, 45k km running." },
    { id: "f1", hubId: "fashion", name: "Goldstar Shoes 032", price: 1250, rating: 4.8, reviews: 1500, seller: "Goldstar Official", stock: 200, image: "https://images.unsplash.com/photo-1560769629-975ec94e6a86?auto=format&fit=crop&w=300&q=80", description: "The Classic Nepali Sneaker. Durable and Comfortable." },
    { id: "r1", hubId: "realstate", name: "Land for Sale in Imadol", price: 3500000, rating: 4.5, reviews: 0, seller: "Nepal Land", stock: 1, image: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=300&q=80", description: "4 Aana, Near Krishna Mandir, 13ft road access. Price per Aana." },
    { id: "p1", hubId: "products", name: "Ultima Watch Magic", price: 3599, rating: 4.5, reviews: 500, seller: "Ultima Lifestyle", stock: 100, image: "https://images.unsplash.com/photo-1579586337278-3befd40fd17a?auto=format&fit=crop&w=300&q=80", description: "BT Calling, 1.83 Display, Nepali Brand." },
    { id: "p2", hubId: "products", name: "Boat Airdopes 141", price: 2999, rating: 4.4, reviews: 1000, seller: "TeleTalk", stock: 200, image: "https://images.unsplash.com/photo-1572569028738-411a56103324?auto=format&fit=crop&w=300&q=80", description: "42 Hours Playback, Beast Mode, ENx Technology." }
];

const INITIAL_VIDEOS: Video[] = [
    { id: "v1", title: "Getting Started with SageX", description: "Learn how to navigate the 3D world.", embedUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ", thumbnail: "https://img.youtube.com/vi/dQw4w9WgXcQ/0.jpg", duration: "10:05", views: 1200 },
    { id: "v2", title: "AI Tools Mastery", description: "Master the 16+ AI tools available.", embedUrl: "https://www.youtube.com/embed/LXb3EKWsInQ", thumbnail: "https://img.youtube.com/vi/LXb3EKWsInQ/0.jpg", duration: "15:30", views: 850 },
    { id: "v3", title: "Future of VR Shopping", description: "How VR is changing e-commerce.", embedUrl: "https://www.youtube.com/embed/f3A59g1C2qQ", thumbnail: "https://img.youtube.com/vi/f3A59g1C2qQ/0.jpg", duration: "08:20", views: 2300 },
    { id: "v4", title: "Coding in the Metaverse", description: "Building 3D web apps with Three.js.", embedUrl: "https://www.youtube.com/embed/Q6q1d8s7JMA", thumbnail: "https://img.youtube.com/vi/Q6q1d8s7JMA/0.jpg", duration: "25:10", views: 5000 },
];

const AI_TOOLS = [
  "Text Generator", "Image Synthesis", "Code Assistant", "Data Analyst", "Voice Clone", "Video Creator",
  "SEO Optimizer", "Logo Maker", "Chat Bot Builder", "Email Writer", "Presentation AI", "Legal Assistant",
  "Medical Diagnosis", "Stock Predictor", "Music Composer", "3D Modeler"
];

const AI_MODEL = "gemini-3-flash-preview";

// --- Shader Helper: Simplex Noise ---
const noiseFunction = `
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
float snoise(vec3 v) {
  const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
  const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i  = floor(v + dot(v, C.yyy) );
  vec3 x0 = v - i + dot(i, C.xxx) ;
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min( g.xyz, l.zxy );
  vec3 i2 = max( g.xyz, l.zxy );
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute( permute( permute(
             i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
           + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
           + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));
  float n_ = 0.142857142857;
  vec3  ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_ );
  vec4 x = x_ *ns.x + ns.yyyy;
  vec4 y = y_ *ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4( x.xy, y.xy );
  vec4 b1 = vec4( x.zw, y.zw );
  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;
  vec3 p0 = vec3(a0.xy,h.x);
  vec3 p1 = vec3(a0.zw,h.y);
  vec3 p2 = vec3(a1.xy,h.z);
  vec3 p3 = vec3(a1.zw,h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1),
                                dot(p2,x2), dot(p3,x3) ) );
}
`;

// --- Sun Shader ---
const sunVertexShader = `
varying vec2 vUv;
varying vec3 vNormal;
void main() {
  vUv = uv;
  vNormal = normal;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const sunFragmentShader = `
uniform float time;
varying vec2 vUv;
varying vec3 vNormal;
${noiseFunction}

void main() {
  float noiseVal = snoise(vNormal * 2.5 + time * 0.5);
  vec3 color1 = vec3(0.8, 0.2, 0.0); 
  vec3 color2 = vec3(1.0, 0.8, 0.1); 
  vec3 color3 = vec3(1.0, 1.0, 0.9); 
  vec3 finalColor = mix(color1, color2, noiseVal * 0.5 + 0.5);
  finalColor = mix(finalColor, color3, pow(max(0.0, noiseVal), 3.0));
  gl_FragColor = vec4(finalColor, 1.0);
}
`;

// Simple shader for low-end devices to avoid expensive noise
const simpleSunFragmentShader = `
uniform float time;
varying vec2 vUv;
varying vec3 vNormal;

void main() {
  vec3 color1 = vec3(0.8, 0.2, 0.0); 
  vec3 color2 = vec3(1.0, 0.8, 0.1); 
  // Simple gradient based on normal Y for static "sun-like" appearance
  float gradient = vNormal.y * 0.5 + 0.5;
  vec3 finalColor = mix(color1, color2, gradient);
  gl_FragColor = vec4(finalColor, 1.0);
}
`;

// --- Components ---

function App() {
  const [navMode, setNavMode] = useState<NavMode>('cinematic');
  const [activeHub, setActiveHub] = useState<HubData | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showAutopilot, setShowAutopilot] = useState(false);
  const [initialHubFilters, setInitialHubFilters] = useState<{sortBy?: string, searchTerm?: string}>({});
  
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [videos, setVideos] = useState<Video[]>(INITIAL_VIDEOS);

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
    setIsCartOpen(true);
  };

  const removeFromCart = (id: string) => setCart(prev => prev.filter(item => item.id !== id));
  
  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(item => item.id === id ? { ...item, quantity: Math.max(1, item.quantity + delta) } : item));
  };

  const handleLogin = (email: string, name: string) => {
    setUser({ id: Date.now().toString(), name, email, wishlist: [], orders: [], balance: 0 });
    setShowAuthModal(false);
  };

  const handlePlaceOrder = (order: Order) => {
    if (user) {
      setUser({ ...user, orders: [order, ...user.orders] });
    }
    setCart([]);
    setIsCheckoutOpen(false);
    alert("Order Placed Successfully! View in Profile.");
  };

  const toggleWishlist = (productId: string) => {
    if (!user) { setShowAuthModal(true); return; }
    const exists = user.wishlist.includes(productId);
    const newWishlist = exists ? user.wishlist.filter(id => id !== productId) : [...user.wishlist, productId];
    setUser({ ...user, wishlist: newWishlist });
  };

  const handleAutopilotCommand = (cmd: string) => {
      const text = cmd.toLowerCase();
      let targetHubId = null;
      let sortBy = "recommended";
      
      if (text.includes("laptop") || text.includes("computer")) targetHubId = "laptop";
      else if (text.includes("mobile") || text.includes("phone")) targetHubId = "mobile";
      else if (text.includes("fashion") || text.includes("cloth") || text.includes("wear")) targetHubId = "fashion";
      else if (text.includes("used") || text.includes("second") || text.includes("2nd")) targetHubId = "secondhand";
      else if (text.includes("video") || text.includes("learn") || text.includes("tutorial")) targetHubId = "video";
      else if (text.includes("tools") || text.includes("ai")) targetHubId = "tools";
      else if (text.includes("real") || text.includes("estate") || text.includes("property")) targetHubId = "realstate";
      else if (text.includes("product") || text.includes("gadget")) targetHubId = "products";

      if (text.includes("cheap") || text.includes("low price") || text.includes("budget")) sortBy = "priceLow";
      else if (text.includes("expensive") || text.includes("premium") || text.includes("high price")) sortBy = "priceHigh";
      else if (text.includes("best") || text.includes("rated") || text.includes("popular")) sortBy = "rating";

      if (targetHubId) {
          const hub = HUBS.find(h => h.id === targetHubId);
          if (hub) {
              setInitialHubFilters({ sortBy });
              setActiveHub(hub);
              setNavMode('cinematic'); 
              setShowAutopilot(false);
          }
      } else {
          alert("Autopilot could not identify a valid destination. Try 'Go to Laptop Hub' or 'Find cheap phones'.");
      }
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  if (showAdmin) {
      return <AdminDashboard 
                onClose={() => setShowAdmin(false)} 
                products={products} 
                setProducts={setProducts} 
                videos={videos} 
                setVideos={setVideos}
                currentUser={user}
            />;
  }

  // Pass !activeHub as 'isVisible' prop to SolarSystemScene to pause rendering when Hub is open
  return (
    <div style={{ width: "100%", height: "100%", position: "relative", overflow: "hidden" }}>
      <SolarSystemScene 
        onHubSelect={(hub) => {
          setInitialHubFilters({}); 
          setActiveHub(hub);
          if(navMode !== 'directory') setNavMode('cinematic'); 
        }} 
        isPaused={navMode === 'directory'}
        isVisible={!activeHub} 
        mode={navMode}
      />
      
      <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 10 }}>
        <Header 
          cartCount={cart.reduce((a, b) => a + b.quantity, 0)} 
          openCart={() => setIsCartOpen(true)}
          toggleChat={() => setIsChatOpen(!isChatOpen)}
          user={user}
          openAuth={() => setShowAuthModal(true)}
          openProfile={() => setShowProfile(true)}
          openAdmin={() => setShowAdmin(true)}
          toggleAutopilot={() => setShowAutopilot(!showAutopilot)}
        />
      </div>

      <NavBar currentMode={navMode} setMode={setNavMode} />

      {showAutopilot && (
          <AutopilotBar 
            onCommand={handleAutopilotCommand} 
            onClose={() => setShowAutopilot(false)} 
          />
      )}

      {navMode === 'directory' && (
        <DirectoryOverlay 
          onSelect={(hub) => {
            setInitialHubFilters({});
            setActiveHub(hub);
            setNavMode('cinematic'); 
          }}
        />
      )}

      {activeHub && (
        <HubOverlay 
          hub={activeHub} 
          products={products}
          videos={videos} 
          onClose={() => setActiveHub(null)}
          onProductClick={(p) => setSelectedProduct(p)}
          initialFilters={initialHubFilters}
        />
      )}

      {selectedProduct && (
        <ProductDetailsModal 
          product={selectedProduct} 
          onClose={() => setSelectedProduct(null)}
          addToCart={addToCart}
          buyNow={(p) => { addToCart(p); setIsCheckoutOpen(true); setSelectedProduct(null); }}
          isWishlisted={user?.wishlist.includes(selectedProduct.id) || false}
          toggleWishlist={() => toggleWishlist(selectedProduct.id)}
        />
      )}

      {isCheckoutOpen && (
        <CheckoutModal 
          cart={cart}
          total={cartTotal}
          onClose={() => setIsCheckoutOpen(false)}
          onPlaceOrder={handlePlaceOrder}
          user={user}
        />
      )}

      {showProfile && user && <ProfileModal user={user} onClose={() => setShowProfile(false)} />}
      {showAuthModal && <AuthModal onLogin={handleLogin} onClose={() => setShowAuthModal(false)} />}
      {isCartOpen && <CartDrawer cart={cart} onClose={() => setIsCartOpen(false)} onRemove={removeFromCart} onUpdateQty={updateQuantity} total={cartTotal} onCheckout={() => { setIsCartOpen(false); setIsCheckoutOpen(true); }} />}
      {isChatOpen && <ChatInterface activeHub={activeHub} onClose={() => setIsChatOpen(false)} />}
    </div>
  );
}

function AutopilotBar({ onCommand, onClose }: { onCommand: (cmd: string) => void, onClose: () => void }) {
    const [input, setInput] = useState("");
    return (
        <div style={{ position: "absolute", top: "80px", left: "50%", transform: "translateX(-50%)", width: "90%", maxWidth: "600px", zIndex: 100, display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ background: "rgba(0, 20, 40, 0.9)", border: "1px solid #00f2ff", borderRadius: "12px", padding: "16px", display: "flex", alignItems: "center", gap: 12, boxShadow: "0 0 30px rgba(0, 242, 255, 0.3)" }}>
                <span style={{ fontSize: "1.5rem" }}>🤖</span>
                <div style={{ flex: 1 }}>
                    <div style={{ color: "#00f2ff", fontSize: "0.8rem", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "4px" }}>Autopilot Command Console</div>
                    <input 
                        autoFocus
                        placeholder="Ex: 'Find me cheap laptop' or 'Go to video hub'" 
                        value={input} 
                        onChange={e => setInput(e.target.value)} 
                        onKeyDown={e => {
                            if(e.key === 'Enter' && input.trim()) onCommand(input);
                        }}
                        style={{ width: "100%", background: "transparent", border: "none", color: "white", fontSize: "1.1rem", outline: "none", fontFamily: "monospace" }} 
                    />
                </div>
                <button onClick={() => input.trim() && onCommand(input)} style={{ background: "#00f2ff", color: "black", border: "none", padding: "8px 16px", borderRadius: "6px", fontWeight: "bold", cursor: "pointer" }}>ENGAGE</button>
                <button onClick={onClose} style={{ background: "transparent", color: "#666", border: "none", fontSize: "1.2rem", cursor: "pointer", padding: "0 8px" }}>×</button>
            </div>
        </div>
    );
}

function AdminDashboard({ onClose, products, setProducts, videos, setVideos, currentUser }: any) {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState("");
    const [activeTab, setActiveTab] = useState('products');
    const [users, setUsers] = useState<User[]>([
        { id: "u1", name: "John Doe", email: "john@example.com", balance: 500, wishlist: [], orders: [] },
        { id: "u2", name: "Jane Smith", email: "jane@example.com", balance: 1200, wishlist: [], orders: [] },
        ...(currentUser ? [currentUser] : [])
    ]);

    const handleLogin = () => {
        if (password === "1234") setIsAuthenticated(true);
        else alert("Incorrect Password");
    };

    if (!isAuthenticated) {
        return (
            <div className="admin-dashboard" style={{ justifyContent: "center", alignItems: "center" }}>
                <div style={{ background: "#111", padding: 40, borderRadius: 16, textAlign: "center", border: "1px solid #333", width: 350, maxWidth: '90%' }}>
                    <h2 style={{ marginBottom: 20 }}>Admin Access</h2>
                    <input type="password" placeholder="Enter Password" value={password} onChange={e => setPassword(e.target.value)} style={{ width: "100%", padding: 12, marginBottom: 20, borderRadius: 8, background: "#222", border: "1px solid #444", color: "white" }} />
                    <button onClick={handleLogin} className="admin-btn btn-primary" style={{ width: "100%", padding: 12, fontSize: "1rem" }}>Login</button>
                    <button onClick={onClose} style={{ marginTop: 16, background: "none", border: "none", color: "#666", cursor: "pointer" }}>Back to Site</button>
                </div>
            </div>
        );
    }

    return (
        <div className="admin-dashboard">
            <div className="admin-header">
                <div style={{ fontWeight: "bold", fontSize: "1.2rem", display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ color: "#00f2ff" }}>SageX</span> Admin Panel
                </div>
                <button onClick={onClose} className="admin-btn btn-danger">Exit</button>
            </div>
            <div className="admin-layout">
                <div className="admin-sidebar">
                    <div className={`admin-nav-item ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}>Users</div>
                    <div className={`admin-nav-item ${activeTab === 'products' ? 'active' : ''}`} onClick={() => setActiveTab('products')}>Products</div>
                    <div className={`admin-nav-item ${activeTab === 'videos' ? 'active' : ''}`} onClick={() => setActiveTab('videos')}>Video Hub</div>
                    <div className={`admin-nav-item ${activeTab === 'support' ? 'active' : ''}`} onClick={() => setActiveTab('support')}>Support</div>
                </div>
                <div className="admin-content">
                    {activeTab === 'products' && <AdminProducts products={products} setProducts={setProducts} />}
                    {activeTab === 'users' && <AdminUsers users={users} setUsers={setUsers} />}
                    {activeTab === 'videos' && <AdminVideos videos={videos} setVideos={setVideos} />}
                    {activeTab === 'support' && <AdminSupport />}
                </div>
            </div>
        </div>
    );
}

function AdminUsers({ users, setUsers }: any) {
    const addFunds = (userId: string) => {
        const amount = prompt("Enter amount to add ($):");
        if (amount && !isNaN(+amount)) {
            setUsers(users.map((u: User) => u.id === userId ? { ...u, balance: u.balance + (+amount) } : u));
        }
    };
    const deleteUser = (userId: string) => {
        if(confirm("Delete this user?")) setUsers(users.filter((u: User) => u.id !== userId));
    };

    return (
        <div>
            <h2>User Management</h2>
            <div className="table-responsive">
                <table className="admin-table">
                    <thead><tr><th>Name</th><th>Email</th><th>Balance</th><th>Actions</th></tr></thead>
                    <tbody>
                        {users.map((u: User) => (
                            <tr key={u.id}>
                                <td>{u.name}</td>
                                <td>{u.email}</td>
                                <td style={{ color: "#00cc66", fontWeight: "bold" }}>${u.balance.toLocaleString()}</td>
                                <td style={{ display: "flex", gap: 8 }}>
                                    <button className="admin-btn btn-primary" onClick={() => addFunds(u.id)}>+ Fund</button>
                                    <button className="admin-btn btn-danger" onClick={() => deleteUser(u.id)}>Del</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function AdminProducts({ products, setProducts }: any) {
    const [isEditing, setIsEditing] = useState(false);
    const [currentProduct, setCurrentProduct] = useState<Partial<Product>>({});

    const saveProduct = () => {
        if (currentProduct.id) {
            setProducts(products.map((p: Product) => p.id === currentProduct.id ? { ...p, ...currentProduct } : p));
        } else {
            const newProd = { ...currentProduct, id: Date.now().toString(), rating: 0, reviews: 0 } as Product;
            setProducts([...products, newProd]);
        }
        setIsEditing(false);
        setCurrentProduct({});
    };

    const deleteProduct = (id: string) => {
        if(confirm("Delete product?")) setProducts(products.filter((p: Product) => p.id !== id));
    };

    return (
        <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h2>Product Management</h2>
                <button className="admin-btn btn-primary" onClick={() => { setCurrentProduct({ hubId: "mobile" }); setIsEditing(true); }}>+ Add</button>
            </div>
            <div className="table-responsive">
                <table className="admin-table">
                    <thead><tr><th>Image</th><th>Name</th><th>Price</th><th>Hub</th><th>Actions</th></tr></thead>
                    <tbody>
                        {products.map((p: Product) => (
                            <tr key={p.id}>
                                <td><img src={p.image} style={{ width: 40, height: 40, borderRadius: 4, objectFit: "cover" }} /></td>
                                <td>{p.name}</td>
                                <td>NPR {p.price}</td>
                                <td>{p.hubId}</td>
                                <td style={{ display: "flex", gap: 8 }}>
                                    <button className="admin-btn btn-primary" onClick={() => { setCurrentProduct(p); setIsEditing(true); }}>Edit</button>
                                    <button className="admin-btn btn-danger" onClick={() => deleteProduct(p.id)}>Del</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {isEditing && (
                <div className="admin-form-overlay">
                    <div className="admin-form">
                        <h3>{currentProduct.id ? "Edit Product" : "New Product"}</h3>
                        <input className="form-input" placeholder="Name" value={currentProduct.name || ""} onChange={e => setCurrentProduct({...currentProduct, name: e.target.value})} />
                        <input className="form-input" placeholder="Price" type="number" value={currentProduct.price || ""} onChange={e => setCurrentProduct({...currentProduct, price: +e.target.value})} />
                        <input className="form-input" placeholder="Image URL" value={currentProduct.image || ""} onChange={e => setCurrentProduct({...currentProduct, image: e.target.value})} />
                        <select className="form-input" value={currentProduct.hubId || "mobile"} onChange={e => setCurrentProduct({...currentProduct, hubId: e.target.value})}>
                            {HUBS.filter(h => h.type === 'shop').map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                        </select>
                        <textarea className="form-input" placeholder="Description" rows={4} value={currentProduct.description || ""} onChange={e => setCurrentProduct({...currentProduct, description: e.target.value})}></textarea>
                        <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
                            <button className="admin-btn btn-success" style={{ flex: 1 }} onClick={saveProduct}>Save</button>
                            <button className="admin-btn btn-danger" style={{ flex: 1 }} onClick={() => setIsEditing(false)}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function AdminVideos({ videos, setVideos }: any) {
    const [isEditing, setIsEditing] = useState(false);
    const [currentVideo, setCurrentVideo] = useState<Partial<Video>>({});

    const saveVideo = () => {
        if (currentVideo.id) {
            setVideos(videos.map((v: Video) => v.id === currentVideo.id ? { ...v, ...currentVideo } : v));
        } else {
            setVideos([...videos, { ...currentVideo, id: Date.now().toString(), views: 0 } as Video]);
        }
        setIsEditing(false);
        setCurrentVideo({});
    };

    return (
        <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h2>Video Management</h2>
                <button className="admin-btn btn-primary" onClick={() => { setCurrentVideo({}); setIsEditing(true); }}>+ Add</button>
            </div>
            <div className="table-responsive">
                <table className="admin-table">
                    <thead><tr><th>Title</th><th>Views</th><th>Duration</th><th>Actions</th></tr></thead>
                    <tbody>
                        {videos.map((v: Video) => (
                            <tr key={v.id}>
                                <td>{v.title}</td>
                                <td>{v.views}</td>
                                <td>{v.duration}</td>
                                <td style={{ display: "flex", gap: 8 }}>
                                    <button className="admin-btn btn-primary" onClick={() => { setCurrentVideo(v); setIsEditing(true); }}>Edit</button>
                                    <button className="admin-btn btn-danger" onClick={() => setVideos(videos.filter((vi: Video) => vi.id !== v.id))}>Del</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
             {isEditing && (
                <div className="admin-form-overlay">
                    <div className="admin-form">
                        <h3>{currentVideo.id ? "Edit Video" : "New Video"}</h3>
                        <input className="form-input" placeholder="Title" value={currentVideo.title || ""} onChange={e => setCurrentVideo({...currentVideo, title: e.target.value})} />
                        <input className="form-input" placeholder="Description" value={currentVideo.description || ""} onChange={e => setCurrentVideo({...currentVideo, description: e.target.value})} />
                        <input className="form-input" placeholder="Embed URL" value={currentVideo.embedUrl || ""} onChange={e => setCurrentVideo({...currentVideo, embedUrl: e.target.value})} />
                        <input className="form-input" placeholder="Thumbnail URL" value={currentVideo.thumbnail || ""} onChange={e => setCurrentVideo({...currentVideo, thumbnail: e.target.value})} />
                        <input className="form-input" placeholder="Duration (e.g. 10:00)" value={currentVideo.duration || ""} onChange={e => setCurrentVideo({...currentVideo, duration: e.target.value})} />
                        <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
                            <button className="admin-btn btn-success" style={{ flex: 1 }} onClick={saveVideo}>Save</button>
                            <button className="admin-btn btn-danger" style={{ flex: 1 }} onClick={() => setIsEditing(false)}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function AdminSupport() {
    return (
        <div>
            <h2>Customer Support</h2>
            <div style={{ background: "#222", padding: 20, borderRadius: 8, textAlign: "center", color: "#888", border: "1px dashed #444" }}>
                <div style={{ fontSize: "2rem", marginBottom: 10 }}>🎧</div>
                No active tickets. Real-time chat system is standing by.
            </div>
        </div>
    );
}

function Header({ cartCount, openCart, toggleChat, user, openAuth, openProfile, openAdmin, toggleAutopilot }: any) {
  return (
    <div className="responsive-header">
      <div className="header-left">
        <h1 style={{ background: "linear-gradient(to right, #00f2ff, #0099ff)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          SageX AI Universe
        </h1>
        <p>The Future of Commerce</p>
      </div>
      <div className="header-right">
        <button className="header-sm-btn" onClick={toggleAutopilot} style={{ background: "rgba(0, 242, 255, 0.15)", border: "1px solid #00f2ff", color: "#00f2ff", fontWeight: 700, boxShadow: "0 0 10px rgba(0, 242, 255, 0.2)" }}>🤖 AUTOPILOT</button>
        <button className="header-sm-btn" onClick={toggleChat} style={{ background: "linear-gradient(135deg, #00f2ff 0%, #0066ff 100%)", border: "none", color: "white", fontWeight: 700, boxShadow: "0 0 10px rgba(0, 102, 255, 0.4)" }}>Ask AI</button>
        <button className="header-sm-btn" onClick={openCart} style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", color: "white", gap: "6px", backdropFilter: "blur(10px)" }}>
          <span>🛒</span><span style={{ fontWeight: "bold" }}>({cartCount})</span>
        </button>
        {user ? (
          <button className="header-sm-btn" onClick={openProfile} style={{ background: "rgba(255,165,0,0.2)", border: "1px solid orange", color: "orange", fontWeight: "bold" }}>👤 {user.name.split(' ')[0]}</button>
        ) : (
          <button className="header-sm-btn" onClick={openAuth} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.5)", color: "white" }}>Login</button>
        )}
        <button className="header-sm-btn" onClick={openAdmin} style={{ background: "rgba(255,0,0,0.1)", border: "1px solid #ff4444", color: "#ff4444" }}>Admin</button>
      </div>
    </div>
  );
}

function HubOverlay({ hub, onClose, onProductClick, products, videos, initialFilters = {} }: any) {
  const [searchTerm, setSearchTerm] = useState(initialFilters.searchTerm || "");
  const [priceRange, setPriceRange] = useState([0, 500000]);
  const [minRating, setMinRating] = useState(0);
  const [sortBy, setSortBy] = useState(initialFilters.sortBy || "recommended");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 8;
  
  useEffect(() => {
      setCurrentPage(1);
  }, [searchTerm, priceRange, minRating, sortBy, hub.id]);

  const hubProducts = products.filter((p: Product) => p.hubId === hub.id);

  const filteredProducts = hubProducts
    .filter((p: any) => p.name.toLowerCase().includes(searchTerm.toLowerCase()))
    .filter((p: any) => p.price >= priceRange[0] && p.price <= priceRange[1])
    .filter((p: any) => p.rating >= minRating)
    .sort((a: any, b: any) => {
        if (sortBy === "priceLow") return a.price - b.price;
        if (sortBy === "priceHigh") return b.price - a.price;
        if (sortBy === "rating") return b.rating - a.rating;
        return 0;
    });

  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
  const displayedProducts = filteredProducts.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  const hasFlashSale = hub.type === 'shop' && Math.random() > 0.3;

  return (
    <div className={`hub-overlay-container ${hub.bgClass || 'bg-default'}`}>
      <div className="hub-overlay-bg-dimmer" />
      <div className="hub-header">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: "2rem" }}>{hub.icon}</span>
          <div><h2 style={{ margin: 0, fontWeight: 800, color: "white", fontSize: "1.5rem" }}>{hub.name}</h2><div style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.6)" }}>{hub.description}</div></div>
        </div>
        <button onClick={onClose} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.2)", color: "white", padding: "8px 16px", borderRadius: "8px", cursor: "pointer" }}>Close</button>
      </div>
      <div className="hub-layout">
        {hub.type === 'shop' && (
           <div className="hub-sidebar">
              <div className="filter-group"><div className="filter-title">Search</div><input type="text" placeholder="Search products..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ width: "100%", padding: "10px", borderRadius: 8, background: "rgba(255,255,255,0.1)", border: "none", color: "white" }} /></div>
              <div className="filter-group"><div className="filter-title">Price Range</div><div style={{ display: "flex", gap: 8 }}><input type="number" value={priceRange[0]} onChange={e => setPriceRange([+e.target.value, priceRange[1]])} style={{ width: "50%", padding: 8, borderRadius: 8, background: "rgba(255,255,255,0.1)", border: "none", color: "white" }} /><input type="number" value={priceRange[1]} onChange={e => setPriceRange([priceRange[0], +e.target.value])} style={{ width: "50%", padding: 8, borderRadius: 8, background: "rgba(255,255,255,0.1)", border: "none", color: "white" }} /></div></div>
              <div className="filter-group"><div className="filter-title">Rating</div><div style={{display: 'flex', flexDirection: 'column', gap: 4}}>{[5, 4, 3, 2, 1].map(r => (<div key={r} onClick={() => setMinRating(r)} style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 8, color: minRating === r ? "orange" : "rgba(255,255,255,0.6)", padding: "4px 0" }}><span style={{ whiteSpace: 'nowrap' }}>{"★".repeat(r)}{"☆".repeat(5-r)}</span><span style={{ fontSize: "0.8rem" }}>& Up</span></div>))}</div></div>
           </div>
        )}
        <div className="hub-main">
            {hasFlashSale && (<div style={{ background: "linear-gradient(90deg, #ff4444, #ff8844)", padding: 20, borderRadius: 12, marginBottom: 24, display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 16, boxShadow: "0 4px 20px rgba(255,68,68,0.3)" }}><div><h3 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 800 }}>⚡ FLASH SALE</h3><p style={{ margin: 0 }}>Up to 60% off ending in 02:14:59</p></div><button style={{ background: "white", color: "#ff4444", border: "none", padding: "10px 24px", borderRadius: 20, fontWeight: "bold", cursor: "pointer", whiteSpace: "nowrap" }}>Shop Now</button></div>)}
            
            {hub.type === 'shop' && (
                <>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16, alignItems: "center" }}><div style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.9rem" }}>{filteredProducts.length} items found</div><select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ background: "rgba(0,0,0,0.5)", color: "white", border: "1px solid rgba(255,255,255,0.2)", padding: "6px 12px", borderRadius: 8, outline: "none", cursor: "pointer" }}><option value="recommended">Recommended</option><option value="priceLow">Price: Low to High</option><option value="priceHigh">Price: High to Low</option><option value="rating">Best Rated</option></select></div>
                
                <div className="product-grid">
                    {displayedProducts.map((product: Product) => (
                        <div key={product.id} onClick={() => onProductClick(product)} className="product-card">
                            <div className="product-card-img-wrapper">
                                <img src={product.image} alt={product.name} />
                                {product.isSecondHand && <span style={{ position: "absolute", top: 8, right: 8, background: "#ff8844", color: "black", padding: "2px 8px", borderRadius: 4, fontSize: "0.7rem", fontWeight: "bold" }}>USED</span>}
                                {product.originalPrice && (<span style={{ position: "absolute", top: 8, left: 8, background: "#ff4444", color: "white", padding: "2px 6px", borderRadius: 4, fontSize: "0.7rem", fontWeight: "bold" }}>-{Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}%</span>)}
                            </div>
                            <div className="product-card-content">
                                <div>
                                    <h3 style={{ margin: "0 0 4px 0", fontSize: "1rem", fontWeight: 600, lineHeight: "1.3", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{product.name}</h3>
                                    <p style={{ margin: 0, fontSize: "0.8rem", color: "#888", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", lineHeight: "1.4" }}>
                                        {product.description || "Premium quality product with advanced features."}
                                    </p>
                                </div>
                                <div>
                                    <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "0.8rem", color: "#fbbf24", marginBottom: 4 }}>
                                        <span>{"★".repeat(Math.round(product.rating))}</span> <span style={{color: "#666"}}>({product.reviews})</span>
                                    </div>
                                    <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                                        <span style={{ color: "#00f2ff", fontSize: "1.1rem", fontWeight: 700 }}>NPR {product.price.toLocaleString()}</span>
                                        {product.originalPrice && <span style={{ textDecoration: "line-through", color: "rgba(255,255,255,0.4)", fontSize: "0.8rem" }}>{product.originalPrice.toLocaleString()}</span>}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {filteredProducts.length > ITEMS_PER_PAGE && (
                    <div className="pagination-container">
                        <button className="pagination-btn" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>Previous</button>
                        <span className="pagination-info">Page {currentPage} of {totalPages}</span>
                        <button className="pagination-btn" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>Next</button>
                    </div>
                )}
                </>
            )}

            {hub.type === 'video' && (
                <div className="product-grid">
                    {videos.map((video: Video) => (
                        <div key={video.id} className="product-card" style={{ cursor: "default" }}>
                            <div style={{ position: "relative", paddingBottom: "56.25%", height: 0, overflow: "hidden", background: "#000" }}>
                                <iframe style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }} src={video.embedUrl} title={video.title} frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen></iframe>
                            </div>
                            <div style={{ padding: 16 }}>
                                <h3 style={{ margin: "0 0 8px 0", fontSize: "1rem" }}>{video.title}</h3>
                                <p style={{ fontSize: "0.85rem", color: "#aaa", margin: 0 }}>{video.description}</p>
                                <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: "#666" }}>
                                    <span>⏱ {video.duration}</span>
                                    <span>👁 {video.views.toLocaleString()} views</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {hub.type === 'tools' && (
                <div className="product-grid">{AI_TOOLS.map((tool, i) => (<div key={i} className="product-card" style={{ padding: 24, alignItems: "center", justifyContent: "center", gap: 16 }}><div style={{ width: 48, height: 48, background: "rgba(0,242,255,0.1)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem" }}>⚡</div><div style={{ textAlign: "center", fontWeight: 600 }}>{tool}</div></div>))}</div>
            )}
        </div>
      </div>
    </div>
  );
}

function NavBar({ currentMode, setMode }: any) {
    return <div className="nav-bar"><button className={`nav-item ${currentMode === 'pilot' ? 'active' : ''}`} onClick={() => setMode('pilot')}>🚀 Pilot</button><button className={`nav-item ${currentMode === 'cinematic' ? 'active' : ''}`} onClick={() => setMode('cinematic')}>🎥 Cinematic</button><button className={`nav-item ${currentMode === 'directory' ? 'active' : ''}`} onClick={() => setMode('directory')}>📂 Directory</button></div>;
}

function DirectoryOverlay({ onSelect }: any) {
    return (
        <div className="directory-overlay">
            {HUBS.map(hub => (
                <div key={hub.id} className="directory-card" onClick={() => onSelect(hub)}>
                    <div className="directory-icon">{hub.icon}</div>
                    <h3>{hub.name}</h3>
                    <p>{hub.description}</p>
                    <div className="directory-btn">ENTER HUB →</div>
                </div>
            ))}
        </div>
    );
}

function ProductDetailsModal({ product, onClose, addToCart, buyNow, isWishlisted, toggleWishlist }: any) {
    return <div className="modal-overlay"><div className="pdp-container"><button onClick={onClose} style={{ position: "absolute", top: 16, right: 16, background: "rgba(255,255,255,0.1)", border: "none", color: "white", width: 32, height: 32, borderRadius: "50%", cursor: "pointer", zIndex: 10 }}>×</button><div className="pdp-image"><img src={product.image} style={{ maxWidth: "100%", maxHeight: "100%", borderRadius: 8, boxShadow: "0 20px 50px rgba(0,0,0,0.5)" }} /></div><div className="pdp-info"><div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}><h1 style={{ margin: "0 0 8px 0", fontSize: "1.8rem", lineHeight: 1.2 }}>{product.name}</h1><button onClick={toggleWishlist} style={{ background: "none", border: "none", fontSize: