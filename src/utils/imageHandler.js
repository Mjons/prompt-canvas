// Image handling utilities for prompt-canvas

const VALID_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const COMPRESSION_THRESHOLD = 500 * 1024; // 500KB
const MAX_COMPRESSED_WIDTH = 800;
const COMPRESSION_QUALITY = 0.8;

/**
 * Validate an image file
 */
export function validateImage(file) {
  if (!file) {
    return { valid: false, error: 'No file provided' };
  }

  if (!VALID_TYPES.includes(file.type)) {
    return { valid: false, error: 'Invalid image type. Supported: PNG, JPEG, GIF, WebP' };
  }

  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB` };
  }

  return { valid: true, error: null };
}

/**
 * Compress an image using canvas
 */
export function compressImage(dataUrl, maxWidth = MAX_COMPRESSED_WIDTH, quality = COMPRESSION_QUALITY) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => resolve(dataUrl); // Return original on error
    img.src = dataUrl;
  });
}

/**
 * Generate a thumbnail for collapsed view
 */
export function generateThumbnail(src, size = 80) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      // Scale to fit within size while maintaining aspect ratio
      if (width > height) {
        if (width > size) {
          height = (height * size) / width;
          width = size;
        }
      } else {
        if (height > size) {
          width = (width * size) / height;
          height = size;
        }
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      resolve(canvas.toDataURL('image/jpeg', 0.7));
    };
    img.onerror = () => resolve(src); // Return original on error
    img.src = src;
  });
}

/**
 * Process an image file and return normalized data
 */
export async function processImageFile(file) {
  const validation = validateImage(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (e) => {
      const dataUrl = e.target.result;

      const img = new Image();
      img.onload = async () => {
        // Compress if file is large
        let finalDataUrl = dataUrl;
        if (file.size > COMPRESSION_THRESHOLD) {
          finalDataUrl = await compressImage(dataUrl, MAX_COMPRESSED_WIDTH, COMPRESSION_QUALITY);
        }

        // Generate thumbnail
        const thumbnail = await generateThumbnail(finalDataUrl, 80);

        resolve({
          src: finalDataUrl,
          thumbnail,
          originalName: file.name,
          width: img.width,
          height: img.height,
          aspectRatio: img.width / img.height,
          fileSize: file.size,
        });
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = dataUrl;
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Get storage usage estimate
 */
export function getStorageUsage() {
  let total = 0;
  for (const key in localStorage) {
    if (Object.prototype.hasOwnProperty.call(localStorage, key)) {
      total += localStorage[key].length * 2; // UTF-16 encoding
    }
  }
  return total;
}

/**
 * Check if storage is near limit
 */
export function isStorageNearLimit(threshold = 0.8) {
  const usage = getStorageUsage();
  const limit = 5 * 1024 * 1024; // 5MB typical limit
  return usage > limit * threshold;
}

/**
 * Calculate anchor position relative to a parent node
 */
export function calculateAnchorPosition(parentNode, anchorPoint) {
  const { position, style } = parentNode;
  const width = style?.width || 280;
  const height = style?.height || 180;

  const anchors = {
    'top-left': { x: position.x - 100, y: position.y - 100 },
    'top-right': { x: position.x + width + 20, y: position.y },
    'bottom-left': { x: position.x - 100, y: position.y + height + 20 },
    'bottom-right': { x: position.x + width + 20, y: position.y + height },
    'center': { x: position.x + width / 2, y: position.y + height / 2 },
  };

  return anchors[anchorPoint] || anchors['top-right'];
}
