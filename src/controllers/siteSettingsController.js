import { SiteSettings } from "../models/index.js";

const DEFAULT_SITE_SETTINGS = {
  logo: "/logovaigai.jpeg",
  address: "Raja Mill Road, Simmakal, Madurai, Tamil Nadu - 625001",
  phone: "+91 8778958663",
  email: "vaigaitourism@gmail.com",
  socialLinks: {
    facebook: "https://facebook.com",
    instagram: "https://instagram.com/vaigai_tourism",
    twitter: "https://twitter.com",
    youtube: "https://youtube.com",
    whatsapp: "https://wa.me/918778958663",
  },
};

const normalizeSiteSettings = (doc = {}) => ({
  logo: doc.logo || DEFAULT_SITE_SETTINGS.logo,
  address: doc.address || DEFAULT_SITE_SETTINGS.address,
  phone: doc.phone || DEFAULT_SITE_SETTINGS.phone,
  email: doc.email || DEFAULT_SITE_SETTINGS.email,
  socialLinks: {
    ...DEFAULT_SITE_SETTINGS.socialLinks,
    ...(doc.socialLinks || {}),
  },
});

const getPublicSiteSettings = async (req, res) => {
  try {
    const settings = await SiteSettings.findOne().sort("-updatedAt").lean();
    res.json(normalizeSiteSettings(settings));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export { DEFAULT_SITE_SETTINGS, normalizeSiteSettings, getPublicSiteSettings };
