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
    return <div className="modal-overlay"><div className="pdp-container"><button onClick={onClose} style={{ position: "absolute", top: 16, right: 16, background: "rgba(255,255,255,0.1)", border: "none", color: "white", width: 32, height: 32, borderRadius: "50%", cursor: "pointer", zIndex: 10 }}>×</button><div className="pdp-image"><img src={product.image} style={{ maxWidth: "100%", maxHeight: "100%", borderRadius: 8, boxShadow: "0 20px 50px rgba(0,0,0,0.5)" }} /></div><div className="pdp-info"><div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}><h1 style={{ margin: "0 0 8px 0", fontSize: "1.8rem", lineHeight: 1.2 }}>{product.name}</h1><button onClick={toggleWishlist} style={{ background: "none", border: "none", fontSize: "1.5rem", cursor: "pointer", color: isWishlisted ? "#ff4444" : "#666" }}>♥</button></div><div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}><span style={{ color: "orange" }}>{"★".repeat(Math.round(product.rating))}</span><span style={{ color: "#888", fontSize: "0.9rem" }}>{product.reviews} Ratings | 1k+ Sold</span></div><div style={{ marginBottom: 20 }}><span style={{ color: "#00f2ff", fontSize: "2rem", fontWeight: 700 }}>NPR {product.price.toLocaleString()}</span>{product.originalPrice && <span style={{ textDecoration: "line-through", color: "#666", marginLeft: 10, fontSize: "1.1rem" }}>NPR {product.originalPrice.toLocaleString()}</span>}</div><div style={{ marginBottom: 24, padding: "16px", background: "rgba(255,255,255,0.05)", borderRadius: 8 }}><div style={{ fontSize: "0.9rem", color: "#aaa" }}>Sold by <span style={{ color: "white", fontWeight: "bold" }}>{product.seller}</span></div><div style={{ fontSize: "0.9rem", color: "#aaa", marginTop: 4 }}>Delivery: <span style={{ color: "white" }}>Standard (2-3 Days)</span></div></div><div style={{ display: "flex", gap: 16, marginBottom: 30 }}><button onClick={() => buyNow(product)} style={{ flex: 1, padding: "14px", background: "#ff6600", border: "none", color: "white", fontWeight: "bold", borderRadius: 8, cursor: "pointer" }}>Buy Now</button><button onClick={() => addToCart(product)} style={{ flex: 1, padding: "14px", background: "#0099ff", border: "none", color: "white", fontWeight: "bold", borderRadius: 8, cursor: "pointer" }}>Add to Cart</button></div><h3 style={{ borderBottom: "1px solid #333", paddingBottom: 8, marginTop: 40 }}>Product Details</h3><p style={{ color: "#ccc", lineHeight: "1.6" }}>{product.description || "Experience top-tier performance and quality with this premium product. Designed for durability and efficiency."}</p></div></div></div>;
}

function CheckoutModal({ cart, total, onClose, onPlaceOrder, user }: any) {
    const [step, setStep] = useState(1);
    const [address, setAddress] = useState({ name: user?.name || "", phone: "", city: "", area: "" });
    const [payment, setPayment] = useState("cod");
    return (
        <div className="modal-overlay"><div className="modal-content-responsive"><div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}><h2 style={{ margin: 0 }}>Checkout</h2><button onClick={onClose} style={{ background: "none", border: "none", color: "#666", fontSize: "1.5rem", cursor: "pointer" }}>×</button></div>
        {step === 1 && (<div><h3 style={{ color: "#00f2ff" }}>1. Shipping Address</h3><div style={{ display: "flex", flexDirection: "column", gap: 12 }}><input placeholder="Full Name" value={address.name} onChange={e => setAddress({...address, name: e.target.value})} style={{ padding: 12, borderRadius: 8, background: "#222", border: "1px solid #444", color: "white", width: "100%" }} /><input placeholder="Phone Number" value={address.phone} onChange={e => setAddress({...address, phone: e.target.value})} style={{ padding: 12, borderRadius: 8, background: "#222", border: "1px solid #444", color: "white", width: "100%" }} /><div style={{ display: "flex", gap: 12 }}><input placeholder="City" value={address.city} onChange={e => setAddress({...address, city: e.target.value})} style={{ flex: 1, padding: 12, borderRadius: 8, background: "#222", border: "1px solid #444", color: "white", width: "100%" }} /><input placeholder="Area / Street" value={address.area} onChange={e => setAddress({...address, area: e.target.value})} style={{ flex: 1, padding: 12, borderRadius: 8, background: "#222", border: "1px solid #444", color: "white", width: "100%" }} /></div></div><button onClick={() => setStep(2)} style={{ width: "100%", marginTop: 20, padding: 14, background: "#00f2ff", border: "none", borderRadius: 8, fontWeight: "bold", cursor: "pointer" }}>Proceed to Payment</button></div>)}
        {step === 2 && (<div><h3 style={{ color: "#00f2ff" }}>2. Payment Method</h3><div style={{ display: "flex", flexDirection: "column", gap: 12 }}>{['cod', 'esewa', 'khalti', 'card'].map(m => (<div key={m} onClick={() => setPayment(m)} style={{ padding: 16, borderRadius: 8, background: payment === m ? "rgba(0,242,255,0.1)" : "#222", border: payment === m ? "1px solid #00f2ff" : "1px solid #444", cursor: "pointer", textTransform: "uppercase", fontWeight: "bold" }}>{m === 'cod' ? "Cash on Delivery" : m}</div>))}</div><div style={{ marginTop: 30, paddingTop: 20, borderTop: "1px solid #333" }}><div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}><span>Subtotal</span><span>NPR {total.toLocaleString()}</span></div><div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}><span>Delivery Fee</span><span>NPR 100</span></div><div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20, fontSize: "1.2rem", fontWeight: "bold", color: "#00f2ff" }}><span>Total</span><span>NPR {(total + 100).toLocaleString()}</span></div><button onClick={() => onPlaceOrder({ id: Date.now().toString(), date: new Date().toLocaleDateString(), items: cart, total: total + 100, status: "Processing" })} style={{ width: "100%", padding: 14, background: "#ff6600", border: "none", borderRadius: 8, fontWeight: "bold", color: "white", cursor: "pointer" }}>Place Order</button><button onClick={() => setStep(1)} style={{ width: "100%", marginTop: 10, background: "none", border: "none", color: "#888", cursor: "pointer" }}>Back</button></div></div>)}</div></div>
    );
}

function AuthModal({ onLogin, onClose }: any) {
  const [isRegister, setIsRegister] = useState(false); const [name, setName] = useState(""); const [email, setEmail] = useState("");
  return <div className="modal-overlay"><div className="modal-content-responsive" style={{ maxWidth: 400 }}><h2 style={{ textAlign: "center", marginBottom: 30, color: "white" }}>{isRegister ? "Create Account" : "Welcome Back"}</h2>{isRegister && <input placeholder="Full Name" value={name} onChange={e => setName(e.target.value)} style={{ width: "100%", padding: 12, marginBottom: 16, borderRadius: 8, background: "#222", border: "1px solid #444", color: "white", boxSizing: "border-box" }} />}<input placeholder="Email Address" value={email} onChange={e => setEmail(e.target.value)} style={{ width: "100%", padding: 12, marginBottom: 16, borderRadius: 8, background: "#222", border: "1px solid #444", color: "white", boxSizing: "border-box" }} /><input type="password" placeholder="Password" style={{ width: "100%", padding: 12, marginBottom: 24, borderRadius: 8, background: "#222", border: "1px solid #444", color: "white", boxSizing: "border-box" }} /><button onClick={() => onLogin(email, name || "User")} style={{ width: "100%", padding: 14, background: "#00f2ff", border: "none", borderRadius: 8, fontWeight: "bold", cursor: "pointer", marginBottom: 16 }}>{isRegister ? "Sign Up" : "Login"}</button><div style={{ textAlign: "center", fontSize: "0.9rem", color: "#888", cursor: "pointer" }} onClick={() => setIsRegister(!isRegister)}>{isRegister ? "Already have an account? Login" : "New to SageX? Register"}</div><button onClick={onClose} style={{ position: "absolute", top: 20, right: 20, background: "none", border: "none", color: "666", fontSize: "1.5rem", cursor: "pointer" }}>×</button></div></div>;
}

function ProfileModal({ user, onClose }: any) {
  const [tab, setTab] = useState('orders');
  return <div className="modal-overlay"><div className="profile-container"><div className="profile-sidebar"><div style={{ textAlign: "center", marginBottom: 30 }}><div style={{ width: 80, height: 80, background: "orange", borderRadius: "50%", margin: "0 auto 10px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2rem" }}>👤</div><div style={{ fontWeight: "bold" }}>{user.name}</div><div style={{ fontSize: "0.8rem", color: "#888" }}>{user.email}</div><div style={{marginTop:10, color:"#00cc66", fontWeight:"bold"}}>Balance: ${user.balance.toLocaleString()}</div></div><div onClick={() => setTab('orders')} style={{ padding: 12, cursor: "pointer", background: tab === 'orders' ? "#333" : "transparent", borderRadius: 8, marginBottom: 8, flexShrink: 0 }}>📦 Orders</div><div onClick={() => setTab('wishlist')} style={{ padding: 12, cursor: "pointer", background: tab === 'wishlist' ? "#333" : "transparent", borderRadius: 8, flexShrink: 0 }}>♥ Wishlist</div><button onClick={onClose} style={{ marginTop: 'auto', width: "100%", padding: 10, background: "#333", border: "none", color: "white", borderRadius: 8, cursor: "pointer" }}>Close</button></div><div className="profile-body"><div style={{display:'flex', justifyContent:'space-between', alignItems:'center', borderBottom: "1px solid #333", paddingBottom: 10, marginBottom: 20}}><h2 style={{margin:0}}>{tab === 'orders' ? "Order History" : "My Wishlist"}</h2><button onClick={onClose} style={{background:"none", border:"none", color:"white", fontSize:"1.5rem", cursor:"pointer"}}>×</button></div>{tab === 'orders' && (<div style={{ display: "flex", flexDirection: "column", gap: 16 }}>{user.orders.length === 0 && <div style={{ color: "#666" }}>No orders yet.</div>}{user.orders.map((order: Order) => (<div key={order.id} style={{ background: "#222", padding: 16, borderRadius: 8 }}><div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}><span style={{ color: "#00f2ff", fontWeight: "bold" }}>Order #{order.id}</span><span style={{ color: order.status === 'Delivered' ? "#0f0" : "orange" }}>{order.status}</span></div><div style={{ fontSize: "0.9rem", color: "#888", marginBottom: 8 }}>{order.date}</div><div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 8 }}>{order.items.map(item => (<img key={item.id} src={item.image} style={{ width: 50, height: 50, borderRadius: 4, objectFit: "cover", flexShrink: 0 }} />))}</div><div style={{ textAlign: "right", fontWeight: "bold", marginTop: 8 }}>Total: NPR {order.total.toLocaleString()}</div></div>))}</div>)}{tab === 'wishlist' && (<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>{user.wishlist.length === 0 && <div style={{ color: "#666" }}>Wishlist is empty.</div>}{user.wishlist.map((pid: string) => { /* Logic to find product from products list not shown for brevity, similar to before */ return <div key={pid}></div>; })}</div>)}</div></div></div>;
}

function CartDrawer({ cart, onClose, onRemove, onUpdateQty, total, onCheckout }: any) {
    return <div style={{ position: "fixed", top: 0, right: 0, width: "100%", maxWidth: "400px", height: "100%", background: "#1a1a1a", zIndex: 100, padding: "20px", display: "flex", flexDirection: "column", boxShadow: "-5px 0 20px rgba(0,0,0,0.5)", transition: "transform 0.3s ease-in-out" }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", borderBottom: "1px solid #333", paddingBottom: "10px" }}><h2 style={{ margin: 0, color: "white" }}>Your Cart ({cart.length})</h2><button onClick={onClose} style={{ background: "transparent", border: "none", color: "white", fontSize: "1.5rem", cursor: "pointer" }}>×</button></div><div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "15px" }}>{cart.length === 0 ? (<div style={{ color: "#888", textAlign: "center", marginTop: "50px" }}>Your cart is empty.</div>) : (cart.map((item: any) => (<div key={item.id} style={{ display: "flex", gap: "10px", background: "#222", padding: "10px", borderRadius: "8px" }}><img src={item.image} alt={item.name} style={{ width: "60px", height: "60px", objectFit: "cover", borderRadius: "4px" }} /><div style={{ flex: 1 }}><div style={{ fontWeight: "bold", fontSize: "0.9rem", color: "white" }}>{item.name}</div><div style={{ color: "#00f2ff", fontSize: "0.9rem" }}>NPR {item.price.toLocaleString()}</div><div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "5px" }}><button onClick={() => onUpdateQty(item.id, -1)} style={{ background: "#444", border: "none", color: "white", width: "24px", height: "24px", borderRadius: "4px", cursor: "pointer" }}>-</button><span style={{ color: "white", fontSize: "0.9rem" }}>{item.quantity}</span><button onClick={() => onUpdateQty(item.id, 1)} style={{ background: "#444", border: "none", color: "white", width: "24px", height: "24px", borderRadius: "4px", cursor: "pointer" }}>+</button></div></div><button onClick={() => onRemove(item.id)} style={{ alignSelf: "flex-start", background: "transparent", border: "none", color: "#ff4444", cursor: "pointer", fontSize: "1.2rem" }}>×</button></div>)))}</div><div style={{ marginTop: "auto", paddingTop: "20px", borderTop: "1px solid #333" }}><div style={{ display: "flex", justifyContent: "space-between", marginBottom: "15px", color: "white", fontWeight: "bold", fontSize: "1.2rem" }}><span>Total:</span><span style={{ color: "#00f2ff" }}>NPR {total.toLocaleString()}</span></div><button onClick={onCheckout} disabled={cart.length === 0} style={{ width: "100%", padding: "15px", background: cart.length === 0 ? "#444" : "#00f2ff", color: cart.length === 0 ? "#888" : "black", border: "none", borderRadius: "8px", fontWeight: "bold", cursor: cart.length === 0 ? "not-allowed" : "pointer" }}>Checkout</button></div></div>;
}

function ChatInterface({ activeHub, onClose }: { activeHub: HubData | null, onClose: () => void }) {
    const [messages, setMessages] = useState<{role: 'user' | 'model', text: string}[]>([{ role: 'model', text: activeHub ? `Welcome to the ${activeHub.name}! I'm SageX, your AI assistant. How can I help you with ${activeHub.description}?` : "Hello! I'm SageX, your personal shopping assistant. Ask me anything about our products or services!" }]); const [input, setInput] = useState(""); const [isLoading, setIsLoading] = useState(false); const scrollRef = useRef<HTMLDivElement>(null); const ai = useMemo(() => new GoogleGenAI({ apiKey: process.env.API_KEY || '' }), []); useEffect(() => { if (scrollRef.current) { scrollRef.current.scrollTop = scrollRef.current.scrollHeight; } }, [messages]); const sendMessage = async () => { if (!input.trim() || isLoading) return; const userMsg = input; setMessages(prev => [...prev, { role: 'user', text: userMsg }]); setInput(""); setIsLoading(true); try { let systemInstruction = "You are SageX, an advanced AI shopping assistant for a futuristic e-commerce platform."; const chat = ai.chats.create({ model: AI_MODEL, config: { systemInstruction }, history: messages.map(m => ({ role: m.role, parts: [{ text: m.text }] })), }); const result = await chat.sendMessage({ message: userMsg }); const responseText = result.text; setMessages(prev => [...prev, { role: 'model', text: responseText || "I'm having trouble connecting right now." }]); } catch (error) { console.error("AI Error:", error); setMessages(prev => [...prev, { role: 'model', text: "Sorry, I encountered an error processing your request." }]); } finally { setIsLoading(false); } };
    return <div className="chat-interface" style={{ position: "absolute", bottom: "20px", right: "20px", width: "350px", height: "500px", background: "rgba(10, 10, 20, 0.95)", borderRadius: "16px", border: "1px solid rgba(0, 242, 255, 0.3)", display: "flex", flexDirection: "column", overflow: "hidden", zIndex: 100, boxShadow: "0 10px 40px rgba(0,0,0,0.5)", backdropFilter: "blur(10px)" }}><div style={{ padding: "15px", background: "linear-gradient(90deg, #00f2ff, #0099ff)", display: "flex", justifyContent: "space-between", alignItems: "center", color: "black" }}><div style={{ fontWeight: "bold", display: "flex", alignItems: "center", gap: "8px" }}><span>✨</span> SageX AI Assistant</div><button onClick={onClose} style={{ background: "transparent", border: "none", color: "black", fontSize: "1.2rem", cursor: "pointer", fontWeight: "bold" }}>×</button></div><div ref={scrollRef} style={{ flex: 1, padding: "15px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "10px" }}>{messages.map((msg, idx) => (<div key={idx} style={{ alignSelf: msg.role === 'user' ? "flex-end" : "flex-start", maxWidth: "80%", padding: "10px 14px", borderRadius: "12px", background: msg.role === 'user' ? "#0099ff" : "rgba(255,255,255,0.1)", color: "white", fontSize: "0.9rem", borderBottomRightRadius: msg.role === 'user' ? "2px" : "12px", borderBottomLeftRadius: msg.role === 'model' ? "2px" : "12px" }}>{msg.text}</div>))} {isLoading && (<div style={{ alignSelf: "flex-start", padding: "10px", color: "#888", fontSize: "0.8rem" }}>SageX is thinking...</div>)}</div><div style={{ padding: "10px", borderTop: "1px solid rgba(255,255,255,0.1)", display: "flex", gap: "10px", background: "rgba(0,0,0,0.3)" }}><input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()} placeholder="Ask anything..." style={{ flex: 1, background: "rgba(255,255,255,0.1)", border: "none", borderRadius: "20px", padding: "10px 15px", color: "white", outline: "none" }} /><button onClick={sendMessage} disabled={isLoading} style={{ background: "#00f2ff", color: "black", border: "none", width: "40px", height: "40px", borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold" }}>➤</button></div></div>;
}

// --- Three.js Logic ---

function getPerformanceTier() {
    // Stricter detection for low-end devices
    // Mobile devices, devices with low memory, or low core count are treated as "low"
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const cores = navigator.hardwareConcurrency || 2;
    // @ts-ignore
    const memory = navigator.deviceMemory || 2; 
    
    // Conservative: If it's a mobile device OR has <= 4GB RAM, treat as low end to guarantee smoothness
    if (isMobile || memory <= 4 || cores <= 4) {
        return 'low';
    }
    return 'high';
}

function SolarSystemScene({ onHubSelect, isPaused, isVisible, mode }: { onHubSelect: (h: HubData) => void, isPaused: boolean, isVisible: boolean, mode: NavMode }) {
  const mountRef = useRef<HTMLDivElement>(null);
  const simState = useRef({ isPaused, mode, isVisible });
  
  // Warp State tracking
  const warpRef = useRef({
      active: false,
      target: new THREE.Vector3(),
      startTime: 0,
      duration: 1.5,
      startPos: new THREE.Vector3(),
      startLookAt: new THREE.Vector3(),
      hub: null as HubData | null
  });

  const hubsRef = useRef<{ 
      mesh: THREE.Mesh, 
      data: HubData, 
      angle: number, 
      labelDiv?: HTMLDivElement
  }[]>([]);

  const controlsRef = useRef<any>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const moveState = useRef({ 
      forward: false, backward: false, left: false, right: false, up: false, down: false, 
      rotX: 0, rotY: 0,
      joyVector: new THREE.Vector2(0, 0)
  });
  const [isLocked, setIsLocked] = useState(false);
  const [showJoysticks, setShowJoysticks] = useState(false);

  useEffect(() => { simState.current = { isPaused, mode, isVisible }; }, [isPaused, mode, isVisible]);

  useEffect(() => {
    const checkTouch = () => {
        if (window.matchMedia("(pointer: coarse)").matches || 'ontouchstart' in window) {
            setShowJoysticks(true);
        }
    };
    checkTouch();
    window.addEventListener('resize', checkTouch);
    return () => window.removeEventListener('resize', checkTouch);
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
        switch(e.code) { case 'KeyW': moveState.current.forward = true; break; case 'KeyS': moveState.current.backward = true; break; case 'KeyA': moveState.current.left = true; break; case 'KeyD': moveState.current.right = true; break; case 'Space': moveState.current.up = true; break; case 'ShiftLeft': moveState.current.down = true; break; }
    };
    const onKeyUp = (e: KeyboardEvent) => {
        switch(e.code) { case 'KeyW': moveState.current.forward = false; break; case 'KeyS': moveState.current.backward = false; break; case 'KeyA': moveState.current.left = false; break; case 'KeyD': moveState.current.right = false; break; case 'Space': moveState.current.up = false; break; case 'ShiftLeft': moveState.current.down = false; break; }
    };
    document.addEventListener('keydown', onKeyDown); document.addEventListener('keyup', onKeyUp);
    return () => { document.removeEventListener('keydown', onKeyDown); document.removeEventListener('keyup', onKeyUp); };
  }, []);

  useEffect(() => {
    if (!mountRef.current) return;
    
    // DEVICE & PERFORMANCE DETECTION
    const tier = getPerformanceTier();
    const isLowEnd = tier === 'low';
    
    // SCENE SETUP
    const scene = new THREE.Scene(); 
    scene.background = new THREE.Color(0x020205); 
    // Reduced fog calculation for low end
    scene.fog = new THREE.FogExp2(0x020205, isLowEnd ? 0.001 : 0.002); 
    
    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 2000); 
    cameraRef.current = camera;
    camera.rotation.order = 'YXZ';
    camera.position.set(0, isLowEnd ? 140 : 100, isLowEnd ? 260 : 180);
    
    const renderer = new THREE.WebGLRenderer({ 
        antialias: !isLowEnd, // OFF for low-end devices
        alpha: false, 
        powerPreference: "high-performance",
        precision: isLowEnd ? "mediump" : "highp", // Lower precision for low-end
        depth: true,
        stencil: false
    }); 
    renderer.setSize(window.innerWidth, window.innerHeight); 
    
    // Cap pixel ratio to 1 for low-end to prevent high-DPI lag
    renderer.setPixelRatio(isLowEnd ? 1 : Math.min(window.devicePixelRatio, 1.5));
    
    if (!isLowEnd) {
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }

    renderer.domElement.style.touchAction = 'none'; 
    mountRef.current.appendChild(renderer.domElement);
    
    const labelContainer = document.createElement('div'); 
    labelContainer.style.position = 'absolute'; labelContainer.style.top = '0'; labelContainer.style.left = '0'; 
    labelContainer.style.width = '100%'; labelContainer.style.height = '100%'; 
    labelContainer.style.pointerEvents = 'none'; labelContainer.style.overflow = 'hidden'; 
    mountRef.current.appendChild(labelContainer);
    
    let orbitControls = new OrbitControls(camera, renderer.domElement); 
    orbitControls.enableDamping = true; orbitControls.dampingFactor = 0.05;
    orbitControls.autoRotate = true; orbitControls.autoRotateSpeed = 0.5; 
    controlsRef.current = orbitControls;
    
    const onMouseMove = (event: MouseEvent) => {
        if (document.pointerLockElement === document.body) {
             camera.rotation.y -= event.movementX * 0.002;
             camera.rotation.x -= event.movementY * 0.002;
             camera.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, camera.rotation.x));
        }
    };
    const onPointerLockChange = () => {
        setIsLocked(document.pointerLockElement === document.body);
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('pointerlockchange', onPointerLockChange);
    
    // LIGHTING
    // Low End: Simple ambient light only (no dynamic lights needed for menu bg)
    const ambientLight = new THREE.AmbientLight(0x404040, isLowEnd ? 3 : 2); 
    scene.add(ambientLight);
    
    const coreLight = new THREE.PointLight(0xffaa00, 3, 400); 
    if (!isLowEnd) {
        // Dynamic shadows only for High End
        coreLight.castShadow = true;
        coreLight.shadow.mapSize.width = 1024;
        coreLight.shadow.mapSize.height = 1024;
        coreLight.shadow.camera.near = 0.5;
        coreLight.shadow.camera.far = 500;
        coreLight.shadow.bias = -0.0001; 
    }
    scene.add(coreLight);
    
    // GEOMETRY OPTIMIZATION
    // Drastically reduce segments for Low End
    const segs = isLowEnd ? 12 : 64; 

    // --- SUN SHADER ---
    const coreGeo = new THREE.SphereGeometry(10, segs, segs); 
    const coreMat = new THREE.ShaderMaterial({
        vertexShader: sunVertexShader,
        // Use simpler shader for low end to avoid expensive noise calculation
        fragmentShader: isLowEnd ? simpleSunFragmentShader : sunFragmentShader,
        uniforms: { time: { value: 0 } }
    });
    const core = new THREE.Mesh(coreGeo, coreMat); 
    scene.add(core);

    if (!isLowEnd) {
        // Only add glow halo on High End devices
        const glowGeo = new THREE.SphereGeometry(12, 32, 32); 
        const glowMat = new THREE.MeshBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 0.3 }); 
        const glow = new THREE.Mesh(glowGeo, glowMat); 
        scene.add(glow);
        
        const haloGeo = new THREE.SphereGeometry(16, 32, 32); 
        const haloMat = new THREE.MeshBasicMaterial({ color: 0xff5500, transparent: true, opacity: 0.15, blending: THREE.AdditiveBlending }); 
        const halo = new THREE.Mesh(haloGeo, haloMat); 
        scene.add(halo);
    }

    // STARS
    const starsGeo = new THREE.BufferGeometry(); 
    // Massive reduction in particles for Low End (500 vs 3000)
    const starsCnt = isLowEnd ? 500 : 3000; 
    const posArray = new Float32Array(starsCnt * 3); 
    const colorsArray = new Float32Array(starsCnt * 3);
    for(let i=0; i<starsCnt*3; i+=3) { 
        posArray[i] = (Math.random() - 0.5) * 1200; 
        posArray[i+1] = (Math.random() - 0.5) * 1200;
        posArray[i+2] = (Math.random() - 0.5) * 1200;
        const c = 0.8 + Math.random() * 0.2;
        colorsArray[i] = c; colorsArray[i+1] = c; colorsArray[i+2] = c;
    } 
    starsGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3)); 
    starsGeo.setAttribute('color', new THREE.BufferAttribute(colorsArray, 3));
    const starsMat = new THREE.PointsMaterial({
        size: isLowEnd ? 2.5 : 0.8, 
        vertexColors: true, 
        sizeAttenuation: true
    }); 
    const starMesh = new THREE.Points(starsGeo, starsMat); 
    scene.add(starMesh);

    // --- BATTLE SYSTEM ---
    const battleGroup = new THREE.Group();
    scene.add(battleGroup);

    // Helper: Create High Fidelity Human Ship (Optimized)
    const createHumanCruiser = () => {
        const ship = new THREE.Group();
        
        if (isLowEnd) {
            // Low-End: Simple Boxy Ship - extremely cheap to render
            const body = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1, 5), new THREE.MeshLambertMaterial({ color: 0x303030 }));
            const wings = new THREE.Mesh(new THREE.BoxGeometry(5, 0.2, 3), new THREE.MeshLambertMaterial({ color: 0x404040 }));
            wings.position.y = -0.2;
            const engineMat = new THREE.MeshLambertMaterial({ color: 0x222222 });
            const engineL = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 2), engineMat); 
            engineL.position.set(-1.5, 0, 2.5);
            const engineR = engineL.clone(); engineR.position.set(1.5, 0, 2.5);
            ship.add(body, wings, engineL, engineR);
        } else {
            // High-End: Detailed "Starfighter"
            const hullMat = new THREE.MeshStandardMaterial({ color: 0x505050, roughness: 0.4, metalness: 0.7 });
            const paintMat = new THREE.MeshStandardMaterial({ color: 0xcc3333, roughness: 0.4, metalness: 0.5 }); // Red stripes
            const cockpitMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.1, metalness: 0.9, emissive: 0x001133, emissiveIntensity: 0.2 });
            const engineGlowMat = new THREE.MeshBasicMaterial({ color: 0x00ffff });
            const darkMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.8 });

            // Fuselage
            const fuselage = new THREE.Mesh(new THREE.BoxGeometry(1, 0.8, 4), hullMat);
            const nose = new THREE.Mesh(new THREE.ConeGeometry(0.5, 2, 8), hullMat);
            nose.rotation.x = -Math.PI/2;
            nose.position.z = -3;
            
            // Cockpit
            const cockpit = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.5, 1.5), cockpitMat);
            cockpit.position.set(0, 0.5, -0.5);

            // Wings
            const wingGeo = new THREE.BoxGeometry(4, 0.1, 2.5);
            const wings = new THREE.Mesh(wingGeo, hullMat);
            wings.position.set(0, -0.1, 0.5);
            
            // Wing Stripes
            const stripeL = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 2.5), paintMat); stripeL.position.set(-1.5, -0.1, 0.5);
            const stripeR = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 2.5), paintMat); stripeR.position.set(1.5, -0.1, 0.5);

            // Engines
            const engineGeo = new THREE.CylinderGeometry(0.4, 0.5, 2.5, 16);
            engineGeo.rotateX(Math.PI/2);
            const engineL = new THREE.Mesh(engineGeo, darkMat); engineL.position.set(-1.2, 0.1, 2);
            const engineR = new THREE.Mesh(engineGeo, darkMat); engineR.position.set(1.2, 0.1, 2);

            // Thrusters
            const glowGeo = new THREE.CircleGeometry(0.35, 16);
            const thrustL = new THREE.Mesh(glowGeo, engineGlowMat); thrustL.position.set(0, 1.26, 0); thrustL.rotation.x = -Math.PI/2;
            const thrustR = new THREE.Mesh(glowGeo, engineGlowMat); thrustR.position.set(0, 1.26, 0); thrustR.rotation.x = -Math.PI/2;
            engineL.add(thrustL);
            engineR.add(thrustR);

            ship.add(fuselage, nose, cockpit, wings, stripeL, stripeR, engineL, engineR);
            ship.traverse(c => { if(c instanceof THREE.Mesh) { c.castShadow = true; c.receiveShadow = true; }});
        }
        
        ship.rotation.y = Math.PI; 
        return ship;
    };

    // Helper: Create Alien Dreadnought (Optimized)
    const createAlienDreadnought = () => {
        const ship = new THREE.Group();
        
        if (isLowEnd) {
             const saucerGeo = new THREE.CylinderGeometry(0.5, 3, 1, 12);
             const saucer = new THREE.Mesh(saucerGeo, new THREE.MeshLambertMaterial({ color: 0x888888 }));
             const dome = new THREE.Mesh(new THREE.SphereGeometry(1.2, 8, 8, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.6 }));
             dome.position.y = 0.2;
             const ring = new THREE.Mesh(new THREE.TorusGeometry(3.5, 0.2, 4, 12), new THREE.MeshBasicMaterial({ color: 0x00ff00 }));
             ring.rotation.x = Math.PI / 2;
             ship.add(saucer, dome, ring);
             ship.userData = { rotator: ring };
        } else {
             const metalMat = new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.2, metalness: 1.0 });
             const glowMat = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
             
             // Central Core
             const core = new THREE.Mesh(new THREE.SphereGeometry(1.5, 32, 32), new THREE.MeshStandardMaterial({
                 color: 0x000000, roughness: 0.1, metalness: 1.0, emissive: 0x003300, emissiveIntensity: 0.5
             }));
             
             // Inner Ring (Rotating)
             const ring1Geo = new THREE.TorusGeometry(3, 0.3, 16, 64);
             const ring1 = new THREE.Mesh(ring1Geo, metalMat);
             ring1.rotation.x = Math.PI / 2;
             
             // Outer Ring (Rotating opposite)
             const ring2Geo = new THREE.TorusGeometry(5, 0.5, 16, 64);
             const ring2 = new THREE.Mesh(ring2Geo, metalMat);
             ring2.rotation.x = Math.PI / 2;
             
             // Connecting Arms/Spikes
             const spikes = new THREE.Group();
             for(let i=0; i<6; i++) {
                 const spike = new THREE.Mesh(new THREE.ConeGeometry(0.5, 6, 8), metalMat);
                 spike.rotation.z = (i / 6) * Math.PI * 2;
                 spike.position.x = Math.cos((i/6)*Math.PI*2) * 4;
                 spike.position.z = Math.sin((i/6)*Math.PI*2) * 4;
                 spike.rotation.x = Math.PI/2;
                 spike.lookAt(new THREE.Vector3(0,0,0));
                 spikes.add(spike);
             }

             ship.add(core, ring1, ring2, spikes);
             ship.traverse(c => { if(c instanceof THREE.Mesh) { c.castShadow = true; c.receiveShadow = true; }});
             
             ship.userData = { 
                 rotator1: ring1,
                 rotator2: ring2,
                 rotator3: spikes
             };
        }
        return ship;
    };

    class Ship {
        mesh: THREE.Group;
        type: 'human' | 'ufo';
        hp: number;
        isDead: boolean;
        target: Ship | null;
        weaponCooldown: number;
        velocity: THREE.Vector3;
        
        constructor(type: 'human' | 'ufo', pos: THREE.Vector3) {
            this.type = type;
            this.mesh = type === 'human' ? createHumanCruiser() : createAlienDreadnought();
            this.mesh.position.copy(pos);
            battleGroup.add(this.mesh);
            this.hp = 100;
            this.isDead = false;
            this.target = null;
            this.weaponCooldown = Math.random() * 100;
            this.velocity = new THREE.Vector3();
        }

        update(delta: number, ships: Ship[]) {
            if (this.isDead) return;
            
            // Rotation Logic
            if (this.type === 'ufo') {
                if (this.mesh.userData.rotator) {
                    this.mesh.userData.rotator.rotation.z += delta * 2;
                }
                if (this.mesh.userData.rotator1) {
                    this.mesh.userData.rotator1.rotation.z += delta * 1;
                    this.mesh.userData.rotator2.rotation.z -= delta * 0.5;
                    this.mesh.userData.rotator3.rotation.y += delta * 0.2;
                }
            }

            const time = Date.now() * 0.0005;
            const tangent = new THREE.Vector3(-this.mesh.position.z, 0, this.mesh.position.x).normalize();
            this.velocity.copy(tangent).multiplyScalar(10 * delta); 
            this.mesh.position.add(this.velocity);
            this.mesh.position.y += Math.sin(time + this.mesh.position.x) * 0.05;
            
            const lookTarget = this.mesh.position.clone().add(tangent.multiplyScalar(10));
            this.mesh.lookAt(lookTarget);
            
            this.weaponCooldown -= delta * 60;
            if (this.weaponCooldown <= 0) {
                if (!this.target || this.target.isDead || this.target.mesh.position.distanceTo(this.mesh.position) > 150) {
                    this.target = ships.find(s => s !== this && s.type !== this.type && !s.isDead) || null;
                }
                if (this.target) {
                    this.fire(this.target);
                    this.weaponCooldown = 20 + Math.random() * 40; 
                }
            }
        }

        fire(target: Ship) {
            const dist = this.mesh.position.distanceTo(target.mesh.position);
            const weaponType = dist < 50 ? 'laser' : (Math.random() > 0.6 ? 'rocket' : 'gun');
            if (weaponType === 'laser') {
                createLaser(this.mesh.position, target.mesh.position, this.type === 'human' ? 0x00ffff : 0x00ff00);
                target.takeDamage(10);
            } else if (weaponType === 'rocket') {
                createRocket(this.mesh.position, target, this.type === 'human' ? 0xffaa00 : 0x00ff00);
            } else {
                createBullet(this.mesh.position, target.mesh.position, this.type === 'human' ? 0xffff00 : 0x00ff00);
                target.takeDamage(5);
            }
        }

        takeDamage(amount: number) {
            this.hp -= amount;
            if (this.hp <= 0 && !this.isDead) this.die();
        }

        die() {
            this.isDead = true;
            createExplosion(this.mesh.position, this.type === 'human' ? 0xffaa00 : 0x00ff00);
            battleGroup.remove(this.mesh);
        }
    }

    const projectiles: any[] = [];
    const explosions: any[] = [];
    const debrisList: any[] = [];

    const createLaser = (start: THREE.Vector3, end: THREE.Vector3, color: number) => {
        const geo = new THREE.BufferGeometry().setFromPoints([start, end]);
        const mat = new THREE.LineBasicMaterial({ color: color }); // Removed additive blending for performance on some mobile GPUs
        const line = new THREE.Line(geo, mat);
        battleGroup.add(line);
        setTimeout(() => { if(battleGroup) battleGroup.remove(line); }, 100); 
    };

    const createBullet = (start: THREE.Vector3, targetPos: THREE.Vector3, color: number) => {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 1), new THREE.MeshBasicMaterial({ color: color }));
        mesh.position.copy(start);
        mesh.lookAt(targetPos);
        const dir = new THREE.Vector3().subVectors(targetPos, start).normalize();
        battleGroup.add(mesh);
        projectiles.push({ mesh, velocity: dir.multiplyScalar(2), life: 60, type: 'bullet' });
    };

    const createRocket = (start: THREE.Vector3, target: Ship, color: number) => {
        const mesh = new THREE.Mesh(new THREE.ConeGeometry(0.3, 1, 4), new THREE.MeshBasicMaterial({ color: 0x333333 })); // Reduced radial segments
        mesh.position.copy(start);
        mesh.rotateX(Math.PI/2);
        
        // Only add light if High End device
        let light;
        if (!isLowEnd) {
            light = new THREE.PointLight(color, 1, 10);
            light.position.y = -0.5;
            mesh.add(light);
        }
        
        battleGroup.add(mesh);
        projectiles.push({ mesh, target, velocity: new THREE.Vector3(0,0,0), speed: 0.5, life: 200, type: 'rocket', light });
    };

    const createExplosion = (pos: THREE.Vector3, color: number) => {
        // Only add dynamic light if High End
        let light;
        if (!isLowEnd) {
             light = new THREE.PointLight(color, 3, 40);
             light.position.copy(pos);
             battleGroup.add(light);
        }
        
        const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 8), new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.8 }));
        mesh.position.copy(pos);
        battleGroup.add(mesh);
        explosions.push({ light, mesh, age: 0, maxAge: 20 }); 
        
        // Reduce debris count significantly for low end
        createDebris(pos, color, isLowEnd ? 2 : 8);
    };

    const createDebris = (pos: THREE.Vector3, color: number, count: number) => {
        for(let i=0; i<count; i++) {
            const size = Math.random() * 0.5 + 0.1;
            const mesh = new THREE.Mesh(new THREE.BoxGeometry(size, size, size), new THREE.MeshBasicMaterial({ color: color }));
            mesh.position.copy(pos);
            mesh.rotation.set(Math.random()*Math.PI, Math.random()*Math.PI, Math.random()*Math.PI);
            const vel = new THREE.Vector3(Math.random()-0.5, Math.random()-0.5, Math.random()-0.5).normalize().multiplyScalar(Math.random() * 0.5);
            battleGroup.add(mesh);
            debrisList.push({ mesh, velocity: vel, rotVel: new THREE.Vector3(Math.random(), Math.random(), Math.random()).multiplyScalar(0.1), life: 40 + Math.random() * 40 });
        }
    };

    const ships: Ship[] = [];
    const spawnShip = (type: 'human' | 'ufo') => {
        const angle = Math.random() * Math.PI * 2;
        const dist = 60 + Math.random() * 40;
        const pos = new THREE.Vector3(Math.cos(angle)*dist, (Math.random()-0.5)*20, Math.sin(angle)*dist);
        ships.push(new Ship(type, pos));
    };

    // Reduce ship count for low end
    const maxShips = isLowEnd ? 2 : 4;
    for(let i=0; i<maxShips; i++) spawnShip('human');
    for(let i=0; i<maxShips; i++) spawnShip('ufo');

    // --- PLANET GENERATION ---
    hubsRef.current = [];
    HUBS.forEach((h, i) => {
        let geo;
        if (h.geometryType === 'torus') {
            geo = new THREE.TorusGeometry(h.radius, h.radius * 0.4, isLowEnd ? 12 : 32, isLowEnd ? 24 : 64);
        } else if (h.geometryType === 'icosahedron') {
            geo = new THREE.IcosahedronGeometry(h.radius, 0);
        } else {
            geo = new THREE.SphereGeometry(h.radius, segs, segs); 
        }

        // Material selection based on performance tier
        let mat;
        if (isLowEnd) {
             // Low end: Simple Lambert material (Gouraud shading)
             mat = new THREE.MeshLambertMaterial({ color: h.color, wireframe: h.geometryType === 'icosahedron' });
        } else {
             // High end: Standard material (PBR) for realistic lighting
             mat = new THREE.MeshStandardMaterial({ 
                 color: h.color, 
                 roughness: 0.6, 
                 metalness: 0.1,
                 wireframe: h.geometryType === 'icosahedron' 
             });
        }

        const mesh = new THREE.Mesh(geo, mat);
        
        if (!isLowEnd) {
            mesh.castShadow = true;
            mesh.receiveShadow = true;
        }

        if (h.hasRing) { 
            const ringGeo = new THREE.RingGeometry(h.radius * 1.5, h.radius * 2.2, isLowEnd ? 24 : 64); 
            const ringMat = new THREE.MeshBasicMaterial({ color: 0xffd700, side: THREE.DoubleSide, transparent: true, opacity: 0.5 }); 
            const ring = new THREE.Mesh(ringGeo, ringMat); 
            ring.rotation.x = -Math.PI / 2; ring.rotation.y = Math.PI / 6; mesh.add(ring); 
        }
        if (h.geometryType === 'icosahedron') {
             const innerGeo = new THREE.IcosahedronGeometry(h.radius * 0.6, 0);
             const innerMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
             const inner = new THREE.Mesh(innerGeo, innerMat);
             mesh.add(inner);
        }

        scene.add(mesh);
        
        const orbitGeo = new THREE.RingGeometry(h.distance - 0.15, h.distance + 0.15, isLowEnd ? 64 : 128); 
        const orbitMat = new THREE.MeshBasicMaterial({ color: h.color, side: THREE.DoubleSide, transparent: true, opacity: 0.15 }); 
        const orbitLine = new THREE.Mesh(orbitGeo, orbitMat); 
        orbitLine.rotation.x = -Math.PI / 2; 
        scene.add(orbitLine);
        
        const label = document.createElement('div'); label.className = 'planet-label'; label.innerHTML = `<span style="font-size:1.2em; margin-right:4px;">${h.icon}</span> ${h.name}`; 
        
        label.onclick = () => {
            if (warpRef.current.active) return;
            warpRef.current.active = true;
            warpRef.current.startTime = clock.getElapsedTime();
            warpRef.current.startPos.copy(camera.position);
            const planetPos = new THREE.Vector3().copy(mesh.position);
            const direction = new THREE.Vector3().subVectors(camera.position, planetPos).normalize();
            warpRef.current.target.copy(planetPos).add(direction.multiplyScalar(10));
            warpRef.current.hub = h;
            controlsRef.current.enabled = false;
        };
        
        labelContainer.appendChild(label);
        
        hubsRef.current.push({ mesh, data: h, angle: Math.random() * Math.PI * 2, labelDiv: label });
    });
    
    // Interaction Handlers (Click, Touch, Joystick) - Keep Existing Logic
    const raycaster = new THREE.Raycaster(); const mouse = new THREE.Vector2();
    const onClick = (e: MouseEvent) => { 
        if (simState.current.mode === 'pilot' && !isLowEnd) { 
            if (document.pointerLockElement !== document.body) document.body.requestPointerLock(); 
            return; 
        } 
        if ((e.target as HTMLElement).closest('.planet-label')) return; 
        
        mouse.x = (e.clientX / window.innerWidth) * 2 - 1; 
        mouse.y = -(e.clientY / window.innerHeight) * 2 + 1; 
        raycaster.setFromCamera(mouse, camera); 
        const intersects = raycaster.intersectObjects(hubsRef.current.map(o => o.mesh)); 
        if (intersects.length > 0) { 
            const hit = hubsRef.current.find(h => h.mesh === intersects[0].object); 
            if (hit && !warpRef.current.active) {
                warpRef.current.active = true;
                warpRef.current.startTime = clock.getElapsedTime();
                warpRef.current.startPos.copy(camera.position);
                const planetPos = new THREE.Vector3().copy(hit.mesh.position);
                const direction = new THREE.Vector3().subVectors(camera.position, planetPos).normalize();
                warpRef.current.target.copy(planetPos).add(direction.multiplyScalar(10));
                warpRef.current.hub = hit.data;
                controlsRef.current.enabled = false;
            } 
        } 
    };
    renderer.domElement.addEventListener('click', onClick);
    (window as any).joystickMove = (dx: number, dy: number) => { 
        moveState.current.joyVector.set(dx, dy);
        moveState.current.left = dx < -0.3; moveState.current.right = dx > 0.3; 
        moveState.current.forward = dy < -0.3; moveState.current.backward = dy > 0.3; 
    };
    (window as any).joystickLook = (dx: number, dy: number) => { 
        // Optimized look sensitivity
        moveState.current.rotY = -dx * 0.03; 
        moveState.current.rotX = -dy * 0.03; 
    };
    
    let animationId: number; const tempV = new THREE.Vector3(); const clock = new THREE.Clock();
    let width = window.innerWidth; let height = window.innerHeight; let frame = 0;

    // --- ANIMATION LOOP ---
    const animate = () => {
        // PERFORMANCE: If hub is open (isVisible == false), completely STOP rendering.
        // This ensures 0% GPU usage when the user is browsing products.
        if (!simState.current.isVisible) {
            setTimeout(() => requestAnimationFrame(animate), 100); // Check again slowly
            return;
        }

        animationId = requestAnimationFrame(animate); 

        frame++;
        const delta = clock.getDelta(); 
        const elapsedTime = clock.getElapsedTime();
        const { isPaused, mode } = simState.current;
        
        coreMat.uniforms.time.value = elapsedTime;

        if (!isPaused) {
            hubsRef.current.forEach(h => { 
                h.angle += h.data.speed * 0.5; 
                h.mesh.position.x = Math.cos(h.angle) * h.data.distance;
                h.mesh.position.z = Math.sin(h.angle) * h.data.distance;
                h.mesh.position.y = 0; 
                h.mesh.rotation.y += 0.005;
                if(h.geometryType === 'torus' || h.geometryType === 'icosahedron') h.mesh.rotation.x += 0.005;
            });
            core.rotation.y += 0.002; 
            starMesh.rotation.y -= 0.0001;

            // --- UPDATE BATTLE ---
            ships.forEach((ship, index) => {
                if(ship.isDead) {
                    ships.splice(index, 1);
                    setTimeout(() => spawnShip(ship.type), 3000);
                } else {
                    ship.update(delta, ships);
                }
            });

            for (let i = projectiles.length - 1; i >= 0; i--) {
                const p = projectiles[i];
                if (p.type === 'bullet') {
                    p.mesh.position.add(p.velocity);
                } else if (p.type === 'rocket') {
                    if (p.target && !p.target.isDead) {
                        const desired = new THREE.Vector3().subVectors(p.target.mesh.position, p.mesh.position).normalize();
                        const steer = desired.sub(p.velocity.clone().normalize()).multiplyScalar(0.05); 
                        p.velocity.add(steer).normalize().multiplyScalar(p.speed);
                        p.mesh.lookAt(p.mesh.position.clone().add(p.velocity));
                        p.mesh.position.add(p.velocity);
                        p.speed += 0.01; 
                        // Only create trail on high end
                        if(!isLowEnd && frame % 3 === 0) createDebris(p.mesh.position, 0x555555, 1);
                    } else {
                        p.mesh.position.add(p.velocity);
                    }
                     if (p.target && !p.target.isDead && p.mesh.position.distanceTo(p.target.mesh.position) < 3) {
                         p.target.takeDamage(40);
                         createExplosion(p.mesh.position, 0xffaa00);
                         p.life = 0; 
                     }
                }

                p.life--;
                if (p.life <= 0) {
                    if (p.light) battleGroup.remove(p.light); // Clean up light
                    battleGroup.remove(p.mesh);
                    projectiles.splice(i, 1);
                }
            }

            for (let i = explosions.length - 1; i >= 0; i--) {
                const ex = explosions[i];
                ex.age++;
                const scale = 1 + (ex.age / ex.maxAge) * 3;
                ex.mesh.scale.set(scale, scale, scale);
                ex.mesh.material.opacity = 1 - (ex.age / ex.maxAge);
                if (ex.light) ex.light.intensity = 5 * (1 - (ex.age / ex.maxAge)); // Only if light exists
                
                if(ex.age >= ex.maxAge) {
                    battleGroup.remove(ex.mesh);
                    if (ex.light) battleGroup.remove(ex.light);
                    explosions.splice(i, 1);
                }
            }

            for (let i = debrisList.length - 1; i >= 0; i--) {
                const d = debrisList[i];
                d.mesh.position.add(d.velocity);
                d.mesh.rotation.x += d.rotVel.x;
                d.mesh.rotation.y += d.rotVel.y;
                d.life--;
                if(d.life <= 0) {
                    battleGroup.remove(d.mesh);
                    debrisList.splice(i, 1);
                }
            }
        }

        if (warpRef.current.active) {
            const t = (elapsedTime - warpRef.current.startTime) / warpRef.current.duration;
            const easeT = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; 
            if (t < 1.0) {
                camera.position.lerpVectors(warpRef.current.startPos, warpRef.current.target, easeT);
                camera.lookAt(warpRef.current.hub ? hubsRef.current.find(h => h.data.id === warpRef.current.hub!.id)!.mesh.position : new THREE.Vector3());
                camera.fov = 45 + (Math.sin(t * Math.PI) * 30); 
                camera.updateProjectionMatrix();
            } else {
                warpRef.current.active = false; camera.fov = 45; camera.updateProjectionMatrix();
                if (warpRef.current.hub) onHubSelect(warpRef.current.hub);
                controlsRef.current.enabled = true;
            }
        } else if (mode === 'cinematic' && orbitControls) { 
            if (moveState.current.rotX !== 0 || moveState.current.rotY !== 0) {
                 orbitControls.autoRotate = false;
                 orbitControls.azimuthAngle -= moveState.current.rotY * 0.05;
                 orbitControls.polarAngle -= moveState.current.rotX * 0.05;
            } else { orbitControls.autoRotate = true; }
            orbitControls.enabled = true; orbitControls.update(); 
        } else if (mode === 'pilot' && !warpRef.current.active) {
             if (orbitControls) orbitControls.enabled = false;
             const speed = 50 * delta; const velocity = new THREE.Vector3();
             if (moveState.current.forward) velocity.z -= speed; if (moveState.current.backward) velocity.z += speed; 
             if (moveState.current.left) velocity.x -= speed; if (moveState.current.right) velocity.x += speed; 
             if (moveState.current.up) velocity.y += speed; if (moveState.current.down) velocity.y -= speed;
             const joy = moveState.current.joyVector;
             if (joy.lengthSq() > 0.01) { velocity.x += joy.x * speed; velocity.z += joy.y * speed; }
             camera.translateX(velocity.x); camera.translateZ(velocity.z); camera.translateY(velocity.y); 
             
             camera.rotateY(moveState.current.rotY); camera.rotateX(moveState.current.rotX); 
             moveState.current.rotX *= 0.85; moveState.current.rotY *= 0.85; 
             camera.rotation.z = 0; 
        } else if (mode === 'directory' && orbitControls) { 
            orbitControls.autoRotate = true; orbitControls.autoRotateSpeed = 0.2; orbitControls.update(); 
        }

        const updateFrequency = isLowEnd ? 4 : 2;
        if (frame % updateFrequency === 0 && !warpRef.current.active) {
            hubsRef.current.forEach(h => { 
                if (h.labelDiv && h.mesh) { 
                    h.mesh.getWorldPosition(tempV); tempV.project(camera); 
                    if (tempV.z < 1 && tempV.z > -1) { 
                        const x = (tempV.x * .5 + .5) * width; const y = (tempV.y * -.5 + .5) * height; 
                        h.labelDiv.style.display = 'block'; h.labelDiv.style.transform = `translate3d(${x.toFixed(1)}px, ${(y - 40).toFixed(1)}px, 0)`;
                    } else { h.labelDiv.style.display = 'none'; } 
                } 
            });
        } else if (warpRef.current.active) { hubsRef.current.forEach(h => { if(h.labelDiv) h.labelDiv.style.display = 'none'; }); }
        
        renderer.render(scene, camera);
    };
    animate();
    
    const handleResize = () => { 
        camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); 
        renderer.setSize(window.innerWidth, window.innerHeight); width = window.innerWidth; height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);
    
    return () => { 
        cancelAnimationFrame(animationId); window.removeEventListener('resize', handleResize); 
        renderer.domElement.removeEventListener('click', onClick); 
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('pointerlockchange', onPointerLockChange);
        if (mountRef.current) mountRef.current.innerHTML = ''; 
        if (orbitControls) orbitControls.dispose(); 
        scene.traverse((object) => { if (object instanceof THREE.Mesh) { object.geometry.dispose(); if (object.material) { if (Array.isArray(object.material)) object.material.forEach((m:any) => m.dispose()); else object.material.dispose(); } } });
        delete (window as any).joystickMove; delete (window as any).joystickLook; 
    };
  }, []);
  
  // Also hide joysticks if scene is not visible (hub open)
  const shouldShowJoysticks = isVisible && showJoysticks && (mode === 'pilot' || mode === 'cinematic');

  return (
      <div style={{ width: '100%', height: '100%', display: isVisible ? 'block' : 'none' }}>
        <div ref={mountRef} style={{ width: "100%", height: "100%", cursor: mode === 'pilot' ? "none" : "crosshair" }} />
        {mode === 'pilot' && !isLocked && !showJoysticks && isVisible && (
            <div className="pilot-instructions">
                <h2>Pilot Mode Engaged</h2>
                <p>WASD to Move | Mouse to Look | Space/Shift to Ascend/Descend</p>
                <button className="pilot-btn" onClick={() => { document.body.requestPointerLock(); }}>CLICK TO START</button>
            </div>
        )}
        {shouldShowJoysticks && (
            <>
                <Joystick zone="left" onMove={(x,y) => (window as any).joystickMove && (window as any).joystickMove(x,y)} />
                <Joystick zone="right" onMove={(x,y) => (window as any).joystickLook && (window as any).joystickLook(x,y)} />
            </>
        )}
      </div>
  );
}

function Joystick({ zone, onMove }: { zone: 'left' | 'right', onMove: (x:number, y:number) => void }) {
    const ref = useRef<HTMLDivElement>(null); const knobRef = useRef<HTMLDivElement>(null); const touchId = useRef<number | null>(null);
    const handleStart = (e: React.TouchEvent) => { 
        e.preventDefault(); e.stopPropagation(); if (touchId.current !== null) return; 
        const touch = e.changedTouches[0]; touchId.current = touch.identifier; update(touch); 
    };
    const handleMove = (e: React.TouchEvent) => { 
        e.preventDefault(); e.stopPropagation(); if (touchId.current === null) return; 
        const touch = Array.from(e.changedTouches).find((t: React.Touch) => t.identifier === touchId.current); if (touch) update(touch); 
    };
    const handleEnd = (e: React.TouchEvent) => { 
        e.preventDefault(); e.stopPropagation(); 
        const touch = Array.from(e.changedTouches).find((t: React.Touch) => t.identifier === touchId.current); 
        if (touch) { touchId.current = null; if (knobRef.current) knobRef.current.style.transform = `translate(-50%, -50%) translate(0px, 0px)`; onMove(0, 0); } 
    };
    const update = (touch: React.Touch) => { if (!ref.current || !knobRef.current) return; const rect = ref.current.getBoundingClientRect(); const centerX = rect.left + rect.width / 2; const centerY = rect.top + rect.height / 2; let dx = touch.clientX - centerX; let dy = touch.clientY - centerY; const distance = Math.sqrt(dx*dx + dy*dy); const maxDist = rect.width / 2; if (distance > maxDist) { const angle = Math.atan2(dy, dx); dx = Math.cos(angle) * maxDist; dy = Math.sin(angle) * maxDist; } knobRef.current.style.transform = `translate(-50%, -50%) translate(${dx}px, ${dy}px)`; onMove(dx / maxDist, dy / maxDist); };
    return <div className="joystick-zone" style={{ left: zone === 'left' ? '40px' : 'auto', right: zone === 'right' ? '40px' : 'auto' }} ref={ref} onTouchStart={handleStart} onTouchMove={handleMove} onTouchEnd={handleEnd}><div className="joystick-base"></div><div className="joystick-knob" ref={knobRef}></div></div>;
}

const root = createRoot(document.getElementById("root")!);
root.render(<App />);