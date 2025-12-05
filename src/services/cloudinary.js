import * as FileSystem from 'expo-file-system';

const CLOUD_NAME = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

export async function uploadToCloudinary(uri) {
  try {
    if (!CLOUD_NAME || !UPLOAD_PRESET) {
      throw new Error('Cloudinary configuration missing');
    }

    // ✅ NEW APPROACH: Use XMLHttpRequest instead of fetch
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      xhr.onload = function() {
        if (xhr.status === 200) {
          try {
            const result = JSON.parse(xhr.responseText);
            console.log('✅ Upload successful:', result.secure_url);
            resolve(result);
          } catch (parseError) {
            reject(new Error('Failed to parse response'));
          }
        } else {
          console.error('❌ Upload failed:', xhr.status, xhr.responseText);
          reject(new Error(`Upload failed: ${xhr.status}`));
        }
      };

      xhr.onerror = function() {
        reject(new Error('Network error during upload'));
      };

      // Prepare form data
      const formData = new FormData();
      formData.append('file', {
        uri: uri,
        type: 'image/jpeg',
        name: 'medication.jpg'
      });
      formData.append('upload_preset', UPLOAD_PRESET);
      formData.append('folder', 'pillpal');

      const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;
      
      xhr.open('POST', uploadUrl);
      xhr.send(formData);
    });
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw error;
  }
}
