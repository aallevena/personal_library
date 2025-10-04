'use client';

import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

interface BarcodeScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (isbn: string) => void;
  onError: (error: string) => void;
}

export default function BarcodeScanner({ isOpen, onClose, onScanSuccess, onError }: BarcodeScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const cleanupInProgressRef = useRef(false);
  const [isScanning, setIsScanning] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [scannerId] = useState(() => `barcode-scanner-${Date.now()}`);

  const validateISBN = (code: string): boolean => {
    // Clean the code (remove hyphens and spaces)
    const cleanCode = code.replace(/[-\s]/g, '');
    
    // Check if it's a valid ISBN format (10 or 13 digits)
    const digits = cleanCode.replace(/\D/g, '');
    return digits.length === 10 || digits.length === 13;
  };

  const handleScanSuccess = async (decodedText: string) => {
    console.log('Scanned code:', decodedText);

    // Stop the scanner first
    await stopScanner();

    // Validate if the scanned code looks like an ISBN
    if (validateISBN(decodedText)) {
      onScanSuccess(decodedText);
      onClose();
    } else {
      onError('Scanned code does not appear to be a valid ISBN');
      onClose();
    }
  };

  const startScanner = async () => {
    if (scannerRef.current) return;

    setPermissionError(null);
    setIsScanning(true);

    // Wait a bit for React to finish rendering
    await new Promise(resolve => setTimeout(resolve, 200));

    // Check if container exists in DOM before proceeding
    const container = document.getElementById(scannerId);
    if (!container) {
      console.error('Scanner container not found in DOM');
      setPermissionError('Scanner initialization failed. Please try again.');
      setIsScanning(false);
      return;
    }

    try {
      const scanner = new Html5Qrcode(scannerId);
      scannerRef.current = scanner;

      // Get available cameras
      const devices = await Html5Qrcode.getCameras();
      if (!devices || devices.length === 0) {
        throw new Error('No cameras found');
      }

      // Use the first available camera (or back camera if available)
      const cameraId = devices[0].id;

      // Start scanning with camera ID instead of facingMode
      await scanner.start(
        cameraId,
        {
          fps: 10,
          qrbox: { width: 250, height: 150 }
        },
        (decodedText) => {
          handleScanSuccess(decodedText);
        },
        (errorMessage) => {
          // Ignore - this fires constantly when no barcode is found
        }
      );

      // Scanner started successfully - isScanning is already true
    } catch (error: any) {
      console.error('Error starting scanner:', error);
      const errorMsg = error?.message || String(error);
      if (errorMsg.includes('Permission') || errorMsg.includes('NotAllowed')) {
        setPermissionError('Camera permission denied. Please allow camera access in your browser settings.');
      } else if (errorMsg.includes('NotFound') || errorMsg.includes('No cameras')) {
        setPermissionError('No camera found. Please make sure your device has a camera.');
      } else {
        setPermissionError(`Failed to start camera: ${errorMsg}`);
      }
      scannerRef.current = null;
      setIsScanning(false);
    }
  };

  const stopScanner = async () => {
    if (!scannerRef.current || cleanupInProgressRef.current) {
      setIsScanning(false);
      return;
    }

    cleanupInProgressRef.current = true;
    const scanner = scannerRef.current;
    scannerRef.current = null;
    setIsScanning(false);

    try {
      if (scanner.isScanning) {
        await scanner.stop();
      }
    } catch (error) {
      console.debug('Scanner stop error:', error);
    } finally {
      cleanupInProgressRef.current = false;
    }
  };

  useEffect(() => {
    // Don't auto-start scanner - let user click a button instead
    // This helps debug if the issue is with modal or scanner

    // Cleanup on unmount or when closing
    return () => {
      if (scannerRef.current) {
        stopScanner();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleClose = async () => {
    await stopScanner();
    // Wait a tick for any pending DOM operations to complete
    await new Promise(resolve => setTimeout(resolve, 100));
    onClose();
  };

  const handleRetry = () => {
    setPermissionError(null);
    startScanner();
  };

  return (
    <div className={`fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50 ${!isOpen ? 'hidden' : ''}`}>
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
                {!scannerRef.current && (
                  <div className="text-center mb-4">
                    <button
                      onClick={startScanner}
                      disabled={isScanning}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                      type="button"
                    >
                      {isScanning ? 'Starting Camera...' : 'Start Camera'}
                    </button>
                  </div>
                )}
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
                id={scannerId}
                className="w-full bg-gray-100 rounded-lg overflow-hidden min-h-[300px] flex items-center justify-center"
                style={{ minHeight: '300px' }}
              >
                {!isScanning && !scannerRef.current && (
                  <div className="text-center text-gray-500">
                    <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <p>Click &quot;Start Camera&quot; to begin scanning</p>
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