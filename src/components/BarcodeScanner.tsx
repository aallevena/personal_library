'use client';

import { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner, Html5QrcodeScanType, Html5QrcodeResult } from 'html5-qrcode';

interface BarcodeScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (isbn: string) => void;
  onError: (error: string) => void;
}

export default function BarcodeScanner({ isOpen, onClose, onScanSuccess, onError }: BarcodeScannerProps) {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  const validateISBN = (code: string): boolean => {
    // Clean the code (remove hyphens and spaces)
    const cleanCode = code.replace(/[-\s]/g, '');
    
    // Check if it's a valid ISBN format (10 or 13 digits)
    const digits = cleanCode.replace(/\D/g, '');
    return digits.length === 10 || digits.length === 13;
  };

  const handleScanSuccess = (decodedText: string) => {
    console.log('Scanned code:', decodedText);
    
    // Stop the scanner first
    setIsScanning(false);
    
    if (scannerRef.current) {
      try {
        scannerRef.current.clear().then(() => {
          scannerRef.current = null;
        }).catch((err) => {
          console.warn('Scanner cleanup after success:', err);
          scannerRef.current = null;
        });
      } catch (error) {
        console.warn('Scanner cleanup error:', error);
        scannerRef.current = null;
      }
    }

    // Validate if the scanned code looks like an ISBN
    if (validateISBN(decodedText)) {
      onScanSuccess(decodedText);
      onClose();
    } else {
      onError('Scanned code does not appear to be a valid ISBN');
      onClose();
    }
  };

  const handleScanFailure = (error: string) => {
    // Don't log every scan attempt failure - it's normal
    if (!error.includes('No MultiFormat Readers were able to detect the code')) {
      console.error('Scan failure:', error);
    }
  };

  const startScanner = () => {
    if (scannerRef.current) return;

    setIsScanning(true);
    setPermissionError(null);

    try {
      const scanner = new Html5QrcodeScanner(
        'barcode-scanner',
        {
          fps: 10,
          qrbox: { width: 250, height: 150 },
          supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
          showTorchButtonIfSupported: true,
          showZoomSliderIfSupported: true,
          defaultZoomValueIfSupported: 1,
        },
        false
      );

      scannerRef.current = scanner;
      scanner.render(handleScanSuccess, handleScanFailure);
    } catch (error) {
      console.error('Error starting scanner:', error);
      setPermissionError('Failed to start camera. Please check your camera permissions.');
      setIsScanning(false);
    }
  };

  const stopScanner = () => {
    if (scannerRef.current) {
      try {
        scannerRef.current.clear().then(() => {
          scannerRef.current = null;
          setIsScanning(false);
        }).catch((err) => {
          // Ignore cleanup errors - they're usually harmless DOM issues
          console.warn('Scanner cleanup warning:', err);
          scannerRef.current = null;
          setIsScanning(false);
        });
      } catch (error) {
        // Handle synchronous errors
        console.warn('Scanner cleanup error:', error);
        scannerRef.current = null;
        setIsScanning(false);
      }
    } else {
      setIsScanning(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      startScanner();
    } else {
      stopScanner();
    }

    // Cleanup on unmount
    return () => {
      stopScanner();
    };
  }, [isOpen, startScanner]);

  const handleClose = () => {
    stopScanner();
    // Small delay to ensure scanner is cleaned up before closing
    setTimeout(() => {
      onClose();
    }, 100);
  };

  const handleRetry = () => {
    setPermissionError(null);
    startScanner();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Scan Book Barcode</h3>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600"
              type="button"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {permissionError ? (
            <div className="text-center py-8">
              <div className="text-red-600 mb-4">
                <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-sm text-red-600 mb-4">{permissionError}</p>
              <button
                onClick={handleRetry}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                type="button"
              >
                Try Again
              </button>
            </div>
          ) : (
            <>
              <div className="mb-4">
                <p className="text-sm text-gray-600 text-center mb-4">
                  Position the book&apos;s barcode in the center of the camera view
                </p>
                {isScanning && (
                  <div className="text-center">
                    <div className="inline-flex items-center text-blue-600">
                      <svg className="animate-spin -ml-1 mr-3 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Scanning...
                    </div>
                  </div>
                )}
              </div>

              <div 
                id="barcode-scanner" 
                className="w-full bg-gray-100 rounded-lg overflow-hidden min-h-[300px] flex items-center justify-center"
                style={{ minHeight: '300px' }}
              >
                {!isScanning && (
                  <div className="text-center text-gray-500">
                    <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <p>Initializing camera...</p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}