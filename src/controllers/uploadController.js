const fs = require('fs');
const path = require('path');

const uploadDirectory = path.join(__dirname, '../../public/uploads');

/**
 * POST /api/upload - Handle file upload (base64 or file payload)
 */
const uploadFile = async (req, res) => {
  try {
    const { filename, filedata } = req.body;

    if (!filename || !filedata) {
      return res.status(400).json({ success: false, message: 'Filename and filedata payload are required' });
    }

    // Extract base64 content
    let base64Content = filedata;
    if (filedata.includes(';base64,')) {
      base64Content = filedata.split(';base64,')[1];
    }

    const buffer = Buffer.from(base64Content, 'base64');
    
    if (buffer.length > 5 * 1024 * 1024) {
      return res.status(400).json({ success: false, message: 'File size exceeds the 5 MB limit. Please upload a smaller file.' });
    }

    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9_.-]/g, '_');
    const uniqueFilename = `${Date.now()}_${sanitizedFilename}`;
    const filePath = path.join(uploadDirectory, uniqueFilename);

    let finalUrl = `/uploads/${uniqueFilename}`;

    try {
      if (!fs.existsSync(uploadDirectory)) {
        fs.mkdirSync(uploadDirectory, { recursive: true });
      }
      fs.writeFileSync(filePath, buffer);
    } catch (fsErr) {
      console.warn('⚠️ Serverless read-only filesystem detected. Falling back to Data URI:', fsErr.message);
      if (filedata.startsWith('data:')) {
        if (!filedata.includes(';name=')) {
          finalUrl = filedata.replace(';base64', `;name=${encodeURIComponent(sanitizedFilename)};base64`);
        } else {
          finalUrl = filedata;
        }
      } else {
        const mimeType = filename.endsWith('.png') ? 'image/png' : filename.endsWith('.gif') ? 'image/gif' : 'image/jpeg';
        finalUrl = `data:${mimeType};name=${encodeURIComponent(sanitizedFilename)};base64,${base64Content}`;
      }
    }

    res.status(201).json({
      success: true,
      message: 'File uploaded successfully',
      data: {
        url: finalUrl,
        filename: uniqueFilename,
        original_name: filename,
        size: buffer.length
      }
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { uploadFile };
