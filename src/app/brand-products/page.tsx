"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Building2,
  Plus,
  Trash2,
  Loader2,
  ChevronDown,
  ChevronRight,
  Image as ImageIcon,
  Globe,
  X,
  User,
  Package,
  Save,
  Wand2,
  DollarSign,
  Tags,
} from "lucide-react";
import { VoicePickerStandalone } from "@/app/components/VoicePickerStandalone";

// ── Types ──

interface VariantData {
  name: string;
  price: number;
  sku?: string;
}

interface ProductData {
  id?: string;
  name: string;
  landingPageUrls: string[];
  images: string[];
  bigIdea: string;
  productInfo: string;
  targetAudience: string;
  price: number | null;
  currency: string;
  variants: VariantData[];
}

interface CharacterData {
  id?: string;
  name: string;
  description: string;
  imageUrl: string;
  voiceId: string;
  voiceSource: string;
  voiceName: string;
}

interface BrandData {
  id: string;
  name: string;
  logoUrl: string | null;
  products: ProductData[];
  characters: CharacterData[];
}

function emptyProduct(): ProductData {
  return {
    name: "",
    landingPageUrls: [""],
    images: [],
    bigIdea: "",
    productInfo: "",
    targetAudience: "",
    price: null,
    currency: "USD",
    variants: [],
  };
}

function emptyCharacter(): CharacterData {
  return {
    name: "",
    description: "",
    imageUrl: "",
    voiceId: "",
    voiceSource: "gemini",
    voiceName: "",
  };
}

// ── Image upload helper ──

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ── Product Card ──

function ProductCard({
  product,
  onChange,
  onRemove,
}: {
  product: ProductData;
  onChange: (p: ProductData) => void;
  onRemove: () => void;
}) {
  const [expanded, setExpanded] = useState(!product.id);
  const [scraping, setScraping] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newImages: string[] = [];
    for (let i = 0; i < files.length; i++) {
      newImages.push(await fileToBase64(files[i]));
    }
    onChange({ ...product, images: [...product.images, ...newImages] });
  };

  const handleUrlChange = (idx: number, val: string) => {
    const urls = [...product.landingPageUrls];
    urls[idx] = val;
    onChange({ ...product, landingPageUrls: urls });
  };

  const handleAutoFill = async () => {
    const urls = product.landingPageUrls.filter((u) => u.trim());
    if (!urls.length) return;
    setScraping(true);
    try {
      const res = await fetch("/api/studio/scrape-landing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls }),
      });
      if (!res.ok) throw new Error("Scrape failed");
      const data = await res.json();
      onChange({
        ...product,
        name: product.name || data.name || "",
        bigIdea: product.bigIdea || data.bigIdea || "",
        productInfo: product.productInfo || data.productInfo || "",
        targetAudience: product.targetAudience || data.targetAudience || "",
        price: product.price ?? data.price ?? null,
        currency: product.currency || data.currency || "USD",
        variants:
          product.variants.length > 0
            ? product.variants
            : data.variants || [],
      });
    } catch {
      /* silent */
    } finally {
      setScraping(false);
    }
  };

  const addVariant = () => {
    onChange({
      ...product,
      variants: [...product.variants, { name: "", price: 0 }],
    });
  };

  const updateVariant = (idx: number, patch: Partial<VariantData>) => {
    const variants = [...product.variants];
    variants[idx] = { ...variants[idx], ...patch };
    onChange({ ...product, variants });
  };

  const removeVariant = (idx: number) => {
    onChange({
      ...product,
      variants: product.variants.filter((_, i) => i !== idx),
    });
  };

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <div
        className="w-full flex items-center gap-2 px-4 py-3 hover:bg-muted/30 transition-colors text-left cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <Package size={14} className="text-emerald-400 shrink-0" />
        <span className="text-sm font-medium flex-1 truncate">
          {product.name || "New Product"}
        </span>
        {product.price != null && (
          <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
            {product.currency} {product.price}
          </span>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="p-1 text-muted-foreground hover:text-red-400 transition-colors"
        >
          <Trash2 size={12} />
        </button>
        {expanded ? (
          <ChevronDown size={14} className="text-muted-foreground" />
        ) : (
          <ChevronRight size={14} className="text-muted-foreground" />
        )}
      </div>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
          {/* Name */}
          <div>
            <label className="text-xs font-medium text-muted-foreground">
              Product Name
            </label>
            <input
              value={product.name}
              onChange={(e) => onChange({ ...product, name: e.target.value })}
              placeholder="e.g. FusiForce Creatine Gummies"
              className="w-full bg-background border border-border rounded px-3 py-2 text-sm mt-1"
            />
          </div>

          {/* Landing Page URLs + Auto-fill */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Globe size={12} />
                Landing Page URLs
              </label>
              <button
                onClick={handleAutoFill}
                disabled={
                  scraping ||
                  !product.landingPageUrls.some((u) => u.trim())
                }
                className="flex items-center gap-1 text-[10px] px-2 py-1 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white rounded font-medium"
              >
                {scraping ? (
                  <Loader2 size={10} className="animate-spin" />
                ) : (
                  <Wand2 size={10} />
                )}
                {scraping ? "Scraping..." : "Auto-fill from URL"}
              </button>
            </div>
            {product.landingPageUrls.map((url, i) => (
              <div key={i} className="flex gap-1.5">
                <input
                  type="url"
                  value={url}
                  onChange={(e) => handleUrlChange(i, e.target.value)}
                  placeholder="https://example.com/product"
                  className="flex-1 bg-background border border-border rounded px-3 py-1.5 text-sm"
                />
                {product.landingPageUrls.length > 1 && (
                  <button
                    onClick={() => {
                      const urls = product.landingPageUrls.filter(
                        (_, idx) => idx !== i
                      );
                      onChange({ ...product, landingPageUrls: urls });
                    }}
                    className="p-1.5 text-muted-foreground hover:text-red-400"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            ))}
            <button
              onClick={() =>
                onChange({
                  ...product,
                  landingPageUrls: [...product.landingPageUrls, ""],
                })
              }
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              <Plus size={12} /> Add URL
            </button>
          </div>

          {/* Price + Currency */}
          <div className="grid grid-cols-[1fr_100px] gap-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <DollarSign size={12} />
                Price
              </label>
              <input
                type="number"
                step="0.01"
                value={product.price ?? ""}
                onChange={(e) =>
                  onChange({
                    ...product,
                    price: e.target.value ? parseFloat(e.target.value) : null,
                  })
                }
                placeholder="29.99"
                className="w-full bg-background border border-border rounded px-3 py-2 text-sm mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">
                Currency
              </label>
              <select
                value={product.currency}
                onChange={(e) =>
                  onChange({ ...product, currency: e.target.value })
                }
                className="w-full bg-background border border-border rounded px-2 py-2 text-sm mt-1"
              >
                <option value="USD">USD</option>
                <option value="GBP">GBP</option>
                <option value="AUD">AUD</option>
                <option value="EUR">EUR</option>
                <option value="CAD">CAD</option>
              </select>
            </div>
          </div>

          {/* Variants */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Tags size={12} />
                Variants
              </label>
              <button
                onClick={addVariant}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                <Plus size={12} /> Add Variant
              </button>
            </div>
            {(product.variants ?? []).length === 0 ? (
              <p className="text-[10px] text-muted-foreground italic">
                No variants
              </p>
            ) : (
              <div className="space-y-1">
                {(product.variants ?? []).map((v, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-1.5 bg-muted/20 rounded px-2 py-1.5"
                  >
                    <input
                      value={v.name}
                      onChange={(e) =>
                        updateVariant(i, { name: e.target.value })
                      }
                      placeholder="Variant name"
                      className="flex-1 bg-background border border-border rounded px-2 py-1 text-xs"
                    />
                    <input
                      type="number"
                      step="0.01"
                      value={v.price || ""}
                      onChange={(e) =>
                        updateVariant(i, {
                          price: parseFloat(e.target.value) || 0,
                        })
                      }
                      placeholder="Price"
                      className="w-20 bg-background border border-border rounded px-2 py-1 text-xs"
                    />
                    <input
                      value={v.sku || ""}
                      onChange={(e) =>
                        updateVariant(i, { sku: e.target.value || undefined })
                      }
                      placeholder="SKU"
                      className="w-24 bg-background border border-border rounded px-2 py-1 text-xs"
                    />
                    <button
                      onClick={() => removeVariant(i)}
                      className="p-1 text-muted-foreground hover:text-red-400"
                    >
                      <X size={10} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Product Images */}
          <div>
            <label className="text-xs font-medium text-muted-foreground">
              Product Images
            </label>
            <div className="flex flex-wrap gap-2 mt-1.5">
              {product.images.map((img, i) => (
                <div key={i} className="relative group">
                  <img
                    src={img}
                    alt={`Product ${i + 1}`}
                    className="h-20 w-20 object-cover rounded border border-border"
                  />
                  <button
                    onClick={() => {
                      const imgs = product.images.filter(
                        (_, idx) => idx !== i
                      );
                      onChange({ ...product, images: imgs });
                    }}
                    className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={10} />
                  </button>
                </div>
              ))}
              <label className="h-20 w-20 border-2 border-dashed border-border rounded flex items-center justify-center cursor-pointer hover:border-muted-foreground transition-colors">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleImageUpload}
                />
                <Plus size={16} className="text-muted-foreground" />
              </label>
            </div>
          </div>

          {/* Big Idea */}
          <div>
            <label className="text-xs font-medium text-muted-foreground">
              Big Idea / Core Message
            </label>
            <input
              value={product.bigIdea}
              onChange={(e) =>
                onChange({ ...product, bigIdea: e.target.value })
              }
              placeholder='"This creatine gummy changed my gym performance"'
              className="w-full bg-background border border-border rounded px-3 py-2 text-sm mt-1"
            />
          </div>

          {/* Product Info */}
          <div>
            <label className="text-xs font-medium text-muted-foreground">
              Product Info
            </label>
            <textarea
              value={product.productInfo}
              onChange={(e) =>
                onChange({ ...product, productInfo: e.target.value })
              }
              placeholder="Creatine monohydrate gummies, 5g per serving..."
              rows={3}
              className="w-full bg-background border border-border rounded px-3 py-2 text-sm mt-1 resize-y"
            />
          </div>

          {/* Target Audience */}
          <div>
            <label className="text-xs font-medium text-muted-foreground">
              Target Audience
            </label>
            <input
              value={product.targetAudience}
              onChange={(e) =>
                onChange({ ...product, targetAudience: e.target.value })
              }
              placeholder="Men 18-35 interested in fitness and bodybuilding"
              className="w-full bg-background border border-border rounded px-3 py-2 text-sm mt-1"
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Character Card ──

function CharacterCard({
  character,
  onChange,
  onRemove,
}: {
  character: CharacterData;
  onChange: (c: CharacterData) => void;
  onRemove: () => void;
}) {
  const [expanded, setExpanded] = useState(!character.id);

  const handleImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const base64 = await fileToBase64(file);
    onChange({ ...character, imageUrl: base64 });
  };

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <div
        className="w-full flex items-center gap-2 px-4 py-3 hover:bg-muted/30 transition-colors text-left cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <User size={14} className="text-violet-400 shrink-0" />
        <span className="text-sm font-medium flex-1 truncate">
          {character.name || "New Character"}
        </span>
        {character.voiceName && (
          <span
            className={`text-[9px] px-1 py-0.5 rounded ${
              character.voiceSource === "elevenlabs"
                ? "bg-violet-500/20 text-violet-400"
                : "bg-cyan-500/20 text-cyan-400"
            }`}
          >
            {character.voiceName}
          </span>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="p-1 text-muted-foreground hover:text-red-400 transition-colors"
        >
          <Trash2 size={12} />
        </button>
        {expanded ? (
          <ChevronDown size={14} className="text-muted-foreground" />
        ) : (
          <ChevronRight size={14} className="text-muted-foreground" />
        )}
      </div>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
          <div className="grid grid-cols-[auto_1fr] gap-4">
            {/* Image */}
            <label className="h-24 w-24 border-2 border-dashed border-border rounded-lg flex items-center justify-center cursor-pointer hover:border-muted-foreground transition-colors overflow-hidden relative group">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
              />
              {character.imageUrl ? (
                <>
                  <img
                    src={character.imageUrl}
                    alt={character.name}
                    className="h-full w-full object-cover"
                  />
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onChange({ ...character, imageUrl: "" });
                    }}
                    className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={10} />
                  </button>
                </>
              ) : (
                <ImageIcon size={20} className="text-muted-foreground" />
              )}
            </label>

            <div className="space-y-2">
              <div>
                <label className="text-xs font-medium text-muted-foreground">
                  Name
                </label>
                <input
                  value={character.name}
                  onChange={(e) =>
                    onChange({ ...character, name: e.target.value })
                  }
                  placeholder="e.g. Sarah, fitness influencer"
                  className="w-full bg-background border border-border rounded px-3 py-1.5 text-sm mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">
                  Description
                </label>
                <input
                  value={character.description}
                  onChange={(e) =>
                    onChange({ ...character, description: e.target.value })
                  }
                  placeholder="Energetic female, 25-30, athletic build"
                  className="w-full bg-background border border-border rounded px-3 py-1.5 text-sm mt-1"
                />
              </div>
            </div>
          </div>

          {/* Voice — using VoicePickerStandalone */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Voice
            </label>
            <VoicePickerStandalone
              value={{
                voiceId: character.voiceId,
                voiceSource: character.voiceSource,
                voiceName: character.voiceName,
              }}
              onChange={(v) =>
                onChange({
                  ...character,
                  voiceId: v.voiceId,
                  voiceSource: v.voiceSource,
                  voiceName: v.voiceName,
                })
              }
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Page ──

export default function BrandProductsPage() {
  const [brands, setBrands] = useState<BrandData[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null);
  const [newBrandName, setNewBrandName] = useState("");

  const selectedBrand = brands.find((b) => b.id === selectedBrandId) || null;

  const fetchBrands = useCallback(async () => {
    try {
      const res = await fetch("/api/brand-config");
      if (res.ok) {
        const data = await res.json();
        setBrands(data.brands || []);
      }
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBrands();
  }, [fetchBrands]);

  const handleCreateBrand = async () => {
    if (!newBrandName.trim()) return;
    try {
      const res = await fetch("/api/brand-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newBrandName }),
      });
      if (res.ok) {
        const data = await res.json();
        setBrands((prev) => [data.brand, ...prev]);
        setSelectedBrandId(data.brand.id);
        setNewBrandName("");
      }
    } catch {
      /* silent */
    }
  };

  const handleSaveBrand = async () => {
    if (!selectedBrand) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/brand-config/${selectedBrand.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: selectedBrand.name,
          logoUrl: selectedBrand.logoUrl,
          products: selectedBrand.products,
          characters: selectedBrand.characters,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setBrands((prev) =>
          prev.map((b) => (b.id === data.brand.id ? data.brand : b))
        );
      }
    } catch {
      /* silent */
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBrand = async (id: string) => {
    try {
      await fetch(`/api/brand-config/${id}`, { method: "DELETE" });
      setBrands((prev) => prev.filter((b) => b.id !== id));
      if (selectedBrandId === id) setSelectedBrandId(null);
    } catch {
      /* silent */
    }
  };

  const updateBrand = (patch: Partial<BrandData>) => {
    if (!selectedBrand) return;
    setBrands((prev) =>
      prev.map((b) =>
        b.id === selectedBrand.id ? { ...b, ...patch } : b
      )
    );
  };

  return (
    <div className="min-h-screen p-6">
      <div className="flex items-center gap-3 mb-6">
        <Building2 size={28} className="text-blue-400" />
        <h1 className="text-2xl font-bold">Brands & Products</h1>
        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
          Config
        </span>
      </div>

      <div className="grid grid-cols-[280px_1fr] gap-6 min-h-[calc(100vh-140px)]">
        {/* Left: Brand list */}
        <div className="space-y-3">
          {/* Create brand */}
          <div className="flex gap-1.5">
            <input
              value={newBrandName}
              onChange={(e) => setNewBrandName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateBrand()}
              placeholder="New brand name..."
              className="flex-1 bg-background border border-border rounded px-3 py-2 text-sm"
            />
            <button
              onClick={handleCreateBrand}
              disabled={!newBrandName.trim()}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-3 py-2 rounded text-sm"
            >
              <Plus size={14} />
            </button>
          </div>

          {/* Brand list */}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2
                size={20}
                className="animate-spin text-muted-foreground"
              />
            </div>
          ) : brands.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No brands yet. Create one above.
            </p>
          ) : (
            <div className="space-y-1">
              {brands.map((b) => (
                <div
                  key={b.id}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-md cursor-pointer transition-colors group ${
                    selectedBrandId === b.id
                      ? "bg-blue-500/10 border border-blue-500/30 text-blue-300"
                      : "hover:bg-muted/50 border border-transparent"
                  }`}
                  onClick={() => setSelectedBrandId(b.id)}
                >
                  <Building2 size={14} className="shrink-0" />
                  <span className="text-sm font-medium flex-1 truncate">
                    {b.name}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {b.products.length}P {b.characters.length}C
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteBrand(b.id);
                    }}
                    className="p-1 text-muted-foreground hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Brand details */}
        {selectedBrand ? (
          <div className="bg-card border border-border rounded-lg p-6 space-y-6 overflow-y-auto max-h-[calc(100vh-140px)]">
            {/* Brand header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <input
                  value={selectedBrand.name}
                  onChange={(e) => updateBrand({ name: e.target.value })}
                  className="text-xl font-bold bg-transparent border-b border-transparent hover:border-border focus:border-primary outline-none"
                />
              </div>
              <button
                onClick={handleSaveBrand}
                disabled={saving}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                {saving ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Save size={14} />
                )}
                {saving ? "Saving..." : "Save Brand"}
              </button>
            </div>

            {/* Products section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Package size={14} className="text-emerald-400" />
                  Products
                </h3>
                <button
                  onClick={() =>
                    updateBrand({
                      products: [
                        ...selectedBrand.products,
                        emptyProduct(),
                      ],
                    })
                  }
                  className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300"
                >
                  <Plus size={12} /> Add Product
                </button>
              </div>

              {selectedBrand.products.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center border border-dashed border-border rounded-lg">
                  No products yet
                </p>
              ) : (
                <div className="space-y-2">
                  {selectedBrand.products.map((p, i) => (
                    <ProductCard
                      key={p.id || `new-${i}`}
                      product={p}
                      onChange={(updated) => {
                        const products = [...selectedBrand.products];
                        products[i] = updated;
                        updateBrand({ products });
                      }}
                      onRemove={() =>
                        updateBrand({
                          products: selectedBrand.products.filter(
                            (_, idx) => idx !== i
                          ),
                        })
                      }
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Characters section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <User size={14} className="text-violet-400" />
                  Characters
                </h3>
                <button
                  onClick={() =>
                    updateBrand({
                      characters: [
                        ...selectedBrand.characters,
                        emptyCharacter(),
                      ],
                    })
                  }
                  className="flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300"
                >
                  <Plus size={12} /> Add Character
                </button>
              </div>

              {selectedBrand.characters.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center border border-dashed border-border rounded-lg">
                  No characters yet
                </p>
              ) : (
                <div className="space-y-2">
                  {selectedBrand.characters.map((c, i) => (
                    <CharacterCard
                      key={c.id || `new-${i}`}
                      character={c}
                      onChange={(updated) => {
                        const characters = [...selectedBrand.characters];
                        characters[i] = updated;
                        updateBrand({ characters });
                      }}
                      onRemove={() =>
                        updateBrand({
                          characters: selectedBrand.characters.filter(
                            (_, idx) => idx !== i
                          ),
                        })
                      }
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-lg flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <Building2 size={40} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">Select a brand to configure</p>
              <p className="text-xs mt-1">
                Or create a new one from the left panel
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
