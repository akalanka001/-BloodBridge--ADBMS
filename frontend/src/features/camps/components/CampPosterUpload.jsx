import React, { useState } from 'react';
import { Upload, X, Image as ImageIcon, AlertCircle } from 'lucide-react';

export function CampPosterUpload({ posterData, setPosterData, disabled = false }) {
  const [error, setError] = useState(null);

  const handleFileChange = (e) => {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setError('Please select a valid image file (JPEG, PNG, or WebP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Image file size exceeds the 5MB limit.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setPosterData({
        base64Data: reader.result,
        originalName: file.name,
        altText: posterData.altText || `${file.name.replace(/\.[^/.]+$/, '')} banner`,
      });
    };
    reader.onerror = () => {
      setError('Failed to read image file.');
    };
    reader.readAsDataURL(file);
  };

  const handleRemove = () => {
    setPosterData({
      base64Data: null,
      originalName: '',
      altText: '',
    });
    setError(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e293b' }}>
        Camp Poster / Promotional Banner (Optional)
      </label>

      {error && (
        <div style={{ padding: '8px 12px', backgroundColor: '#fef2f2', color: '#991b1b', borderRadius: '6px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {posterData.base64Data ? (
        <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', width: '220px', height: '140px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #cbd5e1', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <img
              src={posterData.base64Data}
              alt={posterData.altText || 'Camp Poster Preview'}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
            {!disabled && (
              <button
                type="button"
                onClick={handleRemove}
                title="Remove poster"
                style={{
                  position: 'absolute',
                  top: '6px',
                  right: '6px',
                  backgroundColor: 'rgba(15, 23, 42, 0.75)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '50%',
                  width: '26px',
                  height: '26px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div style={{ flex: '1 1 240px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label htmlFor="poster-alt" style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>
              Alternative Text (for screen readers)
            </label>
            <input
              id="poster-alt"
              type="text"
              placeholder="Descriptive text of the poster"
              value={posterData.altText || ''}
              disabled={disabled}
              onChange={(e) => setPosterData({ ...posterData, altText: e.target.value })}
              style={{ padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
            />
            <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0 }}>
              File: {posterData.originalName || 'uploaded-image'}
            </p>
          </div>
        </div>
      ) : (
        <label
          htmlFor="camp-poster-file"
          style={{
            border: '2px dashed #cbd5e1',
            borderRadius: '8px',
            padding: '24px 16px',
            textAlign: 'center',
            cursor: disabled ? 'not-allowed' : 'pointer',
            backgroundColor: '#f8fafc',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
            transition: 'border-color 0.2s',
          }}
        >
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}>
            <Upload size={20} />
          </div>
          <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#1e293b' }}>
            Click to upload camp poster or venue photograph
          </span>
          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
            JPEG, PNG, or WebP up to 5MB
          </span>
          <input
            id="camp-poster-file"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={disabled}
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
        </label>
      )}
    </div>
  );
}
