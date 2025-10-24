'use client';

import { useState, useEffect, useRef } from 'react';
import { Book, BookFormData } from '../../types/book';
import { User } from '../../types/user';
import { Html5Qrcode } from 'html5-qrcode';

interface FastScanScannerProps {
  defaults: BookFormData;
  onClose: () => void;
  onBookAdded: (book: Book) => void;
  existingBooks: Book[];
}

interface ScanStats {
  scanned: number;
  added: number;
  duplicates: number;
  errors: number;
}

type BannerType = 'adding' | 'added' | 'duplicate' | 'error' | 'api-error';

interface BannerState {
  type: BannerType;
  message: string;
}

export default function FastScanScanner({ defaults, onClose, onBookAdded, existingBooks }: FastScanScannerProps) {
  const [currentDefaults, setCurrentDefaults] = useState<BookFormData>(defaults);
  const [stats, setStats] = useState<ScanStats>({ scanned: 0, added: 0, duplicates: 0, errors: 0 });
  const [banner, setBanner] = useState<BannerState | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showDefaultsEditor, setShowDefaultsEditor] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const cleanupInProgressRef = useRef(false);
  const [isScanning, setIsScanning] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [scannerId] = useState(() => `fast-scanner-${Date.now()}`);

  // Fetch users on component mount
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch('/api/users');
        const data = await response.json();
        if (data.success && data.users) {
          setUsers(data.users);
        }
      } catch (error) {
        console.error('Error fetching users:', error);
      } finally {
        setLoadingUsers(false);
      }
    };
    fetchUsers();
  }, []);

  const validateISBN = (code: string): boolean => {
    const cleanCode = code.replace(/[-\s]/g, '');
    const digits = cleanCode.replace(/\D/g, '');
    return digits.length === 10 || digits.length === 13;
  };

  const checkDuplicate = (isbn: string, owner: string): boolean => {
    return existingBooks.some(
      book => book.isbn === isbn && book.owner === owner
    );
  };

  const handleScanSuccess = async (isbn: string) => {
    if (!validateISBN(isbn) || isProcessing) {
      return;
    }

    setIsProcessing(true);
    setStats(prev => ({ ...prev, scanned: prev.scanned + 1 }));

    // Check for duplicate
    if (checkDuplicate(isbn, currentDefaults.owner)) {
      setBanner({ type: 'duplicate', message: 'Duplicate book skipped (same ISBN + Owner)' });
      setStats(prev => ({ ...prev, duplicates: prev.duplicates + 1 }));
      setIsProcessing(false);
      setTimeout(() => setBanner(null), 2000);
      return;
    }

    // Show "Adding book..." banner
    setBanner({ type: 'adding', message: 'Adding book...' });

    try {
      // Fetch book details from Open Library API
      const apiResponse = await fetch(`/api/isbn/${isbn}`);
      const apiData = await apiResponse.json();

      let bookData: BookFormData = {
        ...currentDefaults,
        isbn,
      };

      if (apiData.success && apiData.book) {
        // Merge API data with defaults (API data takes precedence for title, author, etc.)
        bookData = {
          ...currentDefaults,
          isbn,
          title: apiData.book.title || currentDefaults.title,
          author: apiData.book.author || currentDefaults.author,
          publish_date: apiData.book.publish_date || currentDefaults.publish_date,
          summary: apiData.book.summary || currentDefaults.summary,
        };
      } else {
        // API lookup failed - show banner but continue
        setBanner({ type: 'api-error', message: 'Book not found in API, continuing scan...' });
        setTimeout(() => setBanner(null), 2000);
      }

      // Create the book
      const createResponse = await fetch('/api/books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookData),
      });

      const createData = await createResponse.json();

      if (createResponse.ok && createData.success) {
        setBanner({ type: 'added', message: `Book added! (${stats.added + 1} total)` });
        setStats(prev => ({ ...prev, added: prev.added + 1 }));
        onBookAdded(createData.book);
        setTimeout(() => setBanner(null), 1500);
      } else {
        throw new Error(createData.error || 'Failed to add book');
      }
    } catch (error) {
      console.error('Error adding book:', error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      setBanner({ type: 'error', message: `Error: ${errorMsg}` });
      setStats(prev => ({ ...prev, errors: prev.errors + 1 }));
      setTimeout(() => setBanner(null), 3000);
    } finally {
      setIsProcessing(false);
    }
  };

  const startScanner = async () => {
    if (scannerRef.current) return;

    setPermissionError(null);
    setIsScanning(true);

    await new Promise(resolve => setTimeout(resolve, 200));

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

      const devices = await Html5Qrcode.getCameras();
      if (!devices || devices.length === 0) {
        throw new Error('No cameras found');
      }

      const backCamera = devices.find(device =>
        device.label.toLowerCase().includes('back') ||
        device.label.toLowerCase().includes('rear') ||
        device.label.toLowerCase().includes('environment')
      );
      const cameraId = backCamera ? backCamera.id : devices[devices.length - 1].id;

      await scanner.start(
        cameraId,
        { fps: 10, qrbox: { width: 250, height: 150 } },
        (decodedText) => {
          handleScanSuccess(decodedText);
        },
        () => {
          // Ignore - fires constantly when no barcode found
        }
      );
    } catch (error) {
      console.error('Error starting scanner:', error);
      const errorMsg = error instanceof Error ? error.message : String(error);
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
    return () => {
      if (scannerRef.current) {
        stopScanner();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleClose = async () => {
    await stopScanner();
    await new Promise(resolve => setTimeout(resolve, 100));
    onClose();
  };

  const handleDefaultsChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setCurrentDefaults(prev => ({
      ...prev,
      [name]: name === 'times_read' ? parseInt(value) || 0 : value,
    }));
  };

  const getBannerColor = (type: BannerType): string => {
    switch (type) {
      case 'adding':
        return 'bg-blue-100 border-blue-400 text-blue-800';
      case 'added':
        return 'bg-green-100 border-green-400 text-green-800';
      case 'duplicate':
        return 'bg-yellow-100 border-yellow-400 text-yellow-800';
      case 'api-error':
        return 'bg-orange-100 border-orange-400 text-orange-800';
      case 'error':
        return 'bg-red-100 border-red-400 text-red-800';
      default:
        return 'bg-gray-100 border-gray-400 text-gray-800';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-full sm:max-w-4xl my-4 max-h-[calc(100vh-2rem)] sm:max-h-[90vh] overflow-y-auto">
        <div className="p-6 space-y-4">
          {/* Header */}
          <div className="flex justify-between items-center gap-3">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Fast Scan Mode</h2>
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 font-medium min-h-[44px] touch-manipulation"
            >
              Stop Scanning
            </button>
          </div>

          {/* Status Banner */}
          {banner && (
            <div className={`p-4 border rounded-md ${getBannerColor(banner.type)}`}>
              <p className="font-medium">{banner.message}</p>
            </div>
          )}

          {/* Statistics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-blue-700">{stats.scanned}</div>
              <div className="text-sm text-blue-600">Scanned</div>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-green-700">{stats.added}</div>
              <div className="text-sm text-green-600">Added</div>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-yellow-700">{stats.duplicates}</div>
              <div className="text-sm text-yellow-600">Duplicates</div>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-red-700">{stats.errors}</div>
              <div className="text-sm text-red-600">Errors</div>
            </div>
          </div>

          {/* Edit Defaults Toggle */}
          <div className="flex justify-between items-center">
            <button
              type="button"
              onClick={() => setShowDefaultsEditor(!showDefaultsEditor)}
              className="text-purple-600 hover:text-purple-700 font-medium text-sm"
            >
              {showDefaultsEditor ? '▼ Hide' : '▶ Edit'} Default Values
            </button>
          </div>

          {/* Defaults Editor */}
          {showDefaultsEditor && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
              <p className="text-sm text-gray-700 font-medium">Update defaults (applies to next scanned book):</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">State</label>
                  <select
                    name="state"
                    value={currentDefaults.state}
                    onChange={handleDefaultsChange}
                    className="w-full text-sm border border-gray-300 rounded px-2 py-1 bg-white"
                  >
                    <option value="In library">In library</option>
                    <option value="Checked out">Checked out</option>
                    <option value="Lost">Lost</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Owner</label>
                  <select
                    name="owner"
                    value={currentDefaults.owner}
                    onChange={handleDefaultsChange}
                    disabled={loadingUsers}
                    className="w-full text-sm border border-gray-300 rounded px-2 py-1 bg-white"
                  >
                    <option value="">{loadingUsers ? 'Loading...' : 'Select owner'}</option>
                    {users.map(user => (
                      <option key={user.id} value={user.name}>{user.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Current Possessor</label>
                  <select
                    name="current_possessor"
                    value={currentDefaults.current_possessor}
                    onChange={handleDefaultsChange}
                    disabled={loadingUsers}
                    className="w-full text-sm border border-gray-300 rounded px-2 py-1 bg-white"
                  >
                    <option value="">{loadingUsers ? 'Loading...' : 'Select possessor'}</option>
                    {users.map(user => (
                      <option key={user.id} value={user.name}>{user.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Times Read</label>
                  <input
                    type="number"
                    name="times_read"
                    min="0"
                    value={currentDefaults.times_read}
                    onChange={handleDefaultsChange}
                    className="w-full text-sm border border-gray-300 rounded px-2 py-1 bg-white"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Scanner Area */}
          {permissionError ? (
            <div className="text-center py-8">
              <div className="text-red-600 mb-4">
                <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-sm text-red-600 mb-4">{permissionError}</p>
              <button
                onClick={() => { setPermissionError(null); startScanner(); }}
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
                  Position book barcodes in the center of the camera view. Books will be added automatically.
                </p>
                {!scannerRef.current && (
                  <div className="text-center mb-4">
                    <button
                      onClick={startScanner}
                      disabled={isScanning || isProcessing}
                      className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                      type="button"
                    >
                      {isScanning ? 'Starting Camera...' : 'Start Camera'}
                    </button>
                  </div>
                )}
                {isProcessing && (
                  <div className="text-center">
                    <div className="inline-flex items-center text-purple-600">
                      <svg className="animate-spin -ml-1 mr-3 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing...
                    </div>
                  </div>
                )}
              </div>

              <div
                id={scannerId}
                className="w-full bg-gray-100 rounded-lg overflow-hidden min-h-[300px] flex items-center justify-center"
                style={{ minHeight: '300px', opacity: isProcessing ? 0.5 : 1 }}
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
