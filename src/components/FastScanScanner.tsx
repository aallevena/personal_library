'use client';

import { useState, useEffect, useRef } from 'react';
import { Book, BookFormData } from '../../types/book';
import { User } from '../../types/user';
import { Html5Qrcode } from 'html5-qrcode';
import { ScanConfig } from './FastScanModal';
import { parseTags } from '../app/lib/tagUtils';

interface FastScanScannerProps {
  config: ScanConfig;
  onClose: () => void;
  onBookAdded: (book: Book) => void;
  existingBooks: Book[];
}

interface ScanStats {
  scanned: number;
  added: number;
  duplicates: number;
  errors: number;
  found?: number; // For edit mode
  notFound?: number; // For edit mode
}

interface BookWithChanges extends Book {
  changes: string[]; // Array of change descriptions for preview
}

type BannerType = 'adding' | 'added' | 'duplicate' | 'error' | 'api-error';

interface BannerState {
  type: BannerType;
  message: string;
}

export default function FastScanScanner({ config, onClose, onBookAdded, existingBooks }: FastScanScannerProps) {
  const [currentDefaults, setCurrentDefaults] = useState<BookFormData>(config.defaults);
  const [stats, setStats] = useState<ScanStats>(
    config.mode === 'add'
      ? { scanned: 0, added: 0, duplicates: 0, errors: 0, found: 0, notFound: 0 }
      : { scanned: 0, added: 0, duplicates: 0, errors: 0, found: 0, notFound: 0 }
  );
  const [banner, setBanner] = useState<BannerState | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showDefaultsEditor, setShowDefaultsEditor] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [addedBooks, setAddedBooks] = useState<Book[]>([]); // Track books added in this session (Add mode)

  // Edit mode specific state
  const [foundBooks, setFoundBooks] = useState<BookWithChanges[]>([]); // Books found for editing
  const [notFoundISBNs, setNotFoundISBNs] = useState<string[]>([]); // ISBNs not found in library
  const [showReview, setShowReview] = useState(false); // Show review screen
  const [isApplying, setIsApplying] = useState(false); // Applying batch changes

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const cleanupInProgressRef = useRef(false);
  const processingISBNRef = useRef<Set<string>>(new Set()); // Track ISBNs currently being processed
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
    // Check in both existing books and books added in this session
    const allBooks = [...existingBooks, ...addedBooks];
    return allBooks.some(
      book => book.isbn === isbn && book.owner === owner
    );
  };

  const buildChangesPreview = (book: Book): string[] => {
    const changes: string[] = [];
    const { editFields } = config;

    if (!editFields) return changes;

    if (editFields.state && currentDefaults.state !== book.state) {
      changes.push(`State: ${book.state} → ${currentDefaults.state}`);
    }

    if (editFields.owner && currentDefaults.owner !== book.owner) {
      changes.push(`Owner: ${book.owner} → ${currentDefaults.owner}`);
    }

    if (editFields.current_possessor && currentDefaults.current_possessor !== book.current_possessor) {
      changes.push(`Possessor: ${book.current_possessor} → ${currentDefaults.current_possessor}`);
    }

    if (editFields.times_read?.enabled) {
      const incrementBy = editFields.times_read.incrementBy;
      const newValue = book.times_read + incrementBy;
      changes.push(`Times Read: ${book.times_read} → ${newValue} (+${incrementBy})`);
    }

    if (editFields.last_read && currentDefaults.last_read !== book.last_read) {
      changes.push(`Last Read: ${book.last_read || 'None'} → ${currentDefaults.last_read}`);
    }

    if (editFields.tags?.enabled) {
      const mode = editFields.tags.mode;
      const bookTags = parseTags(book.tags || '');
      const newTags = parseTags(currentDefaults.tags || '');

      if (mode === 'append') {
        const combined = [...new Set([...bookTags, ...newTags])];
        changes.push(`Tags: ${combined.join(' ')} (appended)`);
      } else {
        changes.push(`Tags: ${bookTags.join(' ') || 'None'} → ${newTags.join(' ')} (replaced)`);
      }
    }

    return changes;
  };

  const handleScanSuccess = async (isbn: string) => {
    if (!validateISBN(isbn)) {
      return;
    }

    // Stop scanner while processing - simply return if already processing
    if (isProcessing) {
      return;
    }

    // Prevent duplicate processing of the same ISBN
    const isbnKey = `${isbn}`;
    if (processingISBNRef.current.has(isbnKey)) {
      return;
    }

    // Mark this ISBN as being processed - this will block new scans
    processingISBNRef.current.add(isbnKey);
    setIsProcessing(true);

    setStats(prev => ({ ...prev, scanned: prev.scanned + 1 }));

    if (config.mode === 'add') {
      // ADD MODE - Original behavior
      // Check for duplicate
      if (checkDuplicate(isbn, currentDefaults.owner)) {
        setBanner({ type: 'duplicate', message: 'Duplicate book skipped (same ISBN + Owner)' });
        setStats(prev => ({ ...prev, duplicates: (prev.duplicates || 0) + 1 }));
        processingISBNRef.current.delete(isbnKey);
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
          setBanner({ type: 'added', message: `Book added! (${(stats.added || 0) + 1} total)` });
          setStats(prev => ({ ...prev, added: (prev.added || 0) + 1 }));
          setAddedBooks(prev => [...prev, createData.book]); // Track this book
          onBookAdded(createData.book);
          setTimeout(() => setBanner(null), 1500);
        } else {
          // Handle specific error types
          const errorMsg = createData.error || 'Failed to add book';

          // Check if it's a duplicate/constraint error
          if (errorMsg.toLowerCase().includes('duplicate') ||
              errorMsg.toLowerCase().includes('already exists') ||
              errorMsg.toLowerCase().includes('unique constraint')) {
            setBanner({ type: 'duplicate', message: `Duplicate: Book already exists (ISBN: ${isbn.slice(-4)})` });
            setStats(prev => ({ ...prev, duplicates: (prev.duplicates || 0) + 1 }));
            setTimeout(() => setBanner(null), 2000);
          } else if (errorMsg.toLowerCase().includes('required') ||
                     errorMsg.toLowerCase().includes('missing') ||
                     errorMsg.toLowerCase().includes('cannot be empty')) {
            setBanner({ type: 'error', message: `Validation error: ${errorMsg}` });
            setStats(prev => ({ ...prev, errors: prev.errors + 1 }));
            setTimeout(() => setBanner(null), 3000);
          } else {
            setBanner({ type: 'error', message: `Failed to save: ${errorMsg}` });
            setStats(prev => ({ ...prev, errors: prev.errors + 1 }));
            setTimeout(() => setBanner(null), 3000);
          }
        }
      } catch (error) {
        console.error('Error adding book:', error);
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';

        // More specific error messages
        if (errorMsg.includes('fetch')) {
          setBanner({ type: 'error', message: 'Network error: Could not reach server' });
        } else if (errorMsg.includes('JSON')) {
          setBanner({ type: 'error', message: 'Data error: Invalid response from server' });
        } else {
          setBanner({ type: 'error', message: `System error: ${errorMsg}` });
        }

        setStats(prev => ({ ...prev, errors: prev.errors + 1 }));
        setTimeout(() => setBanner(null), 3000);
      } finally {
        processingISBNRef.current.delete(isbnKey);
        setIsProcessing(false);
      }
    } else {
      // EDIT MODE - Look up book and collect for batch edit
      try {
        // Look up book in existing books
        const foundBook = existingBooks.find(book => book.isbn === isbn);

        if (foundBook) {
          // Check if already in foundBooks list
          if (foundBooks.some(b => b.id === foundBook.id)) {
            setBanner({ type: 'duplicate', message: 'Already scanned this book' });
            setTimeout(() => setBanner(null), 2000);
            processingISBNRef.current.delete(isbnKey);
            setIsProcessing(false);
            return;
          }

          // Build changes preview
          const changes = buildChangesPreview(foundBook);

          if (changes.length === 0) {
            setBanner({ type: 'api-error', message: 'No changes to apply (values already match)' });
            setTimeout(() => setBanner(null), 2000);
          } else {
            const bookWithChanges: BookWithChanges = { ...foundBook, changes };
            setFoundBooks(prev => [...prev, bookWithChanges]);
            setStats(prev => ({ ...prev, found: (prev.found || 0) + 1 }));
            setBanner({ type: 'added', message: `Book found! (${(stats.found || 0) + 1} ready to edit)` });
            setTimeout(() => setBanner(null), 1500);
          }
        } else {
          // Book not found in library
          if (!notFoundISBNs.includes(isbn)) {
            setNotFoundISBNs(prev => [...prev, isbn]);
            setStats(prev => ({ ...prev, notFound: (prev.notFound || 0) + 1 }));
          }
          setBanner({ type: 'error', message: `Book not found in library (ISBN: ${isbn.slice(-4)})` });
          setTimeout(() => setBanner(null), 2000);
        }
      } catch (error) {
        console.error('Error looking up book:', error);
        setBanner({ type: 'error', message: 'Error looking up book' });
        setStats(prev => ({ ...prev, errors: prev.errors + 1 }));
        setTimeout(() => setBanner(null), 2000);
      } finally {
        processingISBNRef.current.delete(isbnKey);
        setIsProcessing(false);
      }
    }
  };

  const applyBatchChanges = async () => {
    setIsApplying(true);
    await stopScanner(); // Stop scanning before applying

    let successCount = 0;
    let errorCount = 0;

    for (const bookWithChanges of foundBooks) {
      try {
        const { editFields } = config;
        if (!editFields) continue;

        const updates: Partial<Book> = {};

        // Build updates based on selected fields
        if (editFields.state) {
          updates.state = currentDefaults.state;
        }

        if (editFields.owner) {
          updates.owner = currentDefaults.owner;
        }

        if (editFields.current_possessor) {
          updates.current_possessor = currentDefaults.current_possessor;
        }

        if (editFields.times_read?.enabled) {
          updates.times_read = bookWithChanges.times_read + editFields.times_read.incrementBy;
        }

        if (editFields.last_read) {
          updates.last_read = currentDefaults.last_read;
        }

        if (editFields.tags?.enabled) {
          const mode = editFields.tags.mode;
          const bookTags = parseTags(bookWithChanges.tags || '');
          const newTags = parseTags(currentDefaults.tags || '');

          if (mode === 'append') {
            const combined = [...new Set([...bookTags, ...newTags])];
            updates.tags = combined.join(' ');
          } else {
            updates.tags = currentDefaults.tags;
          }
        }

        // Apply the update
        const response = await fetch(`/api/books/${bookWithChanges.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        });

        if (response.ok) {
          successCount++;
        } else {
          errorCount++;
          console.error(`Failed to update book ${bookWithChanges.id}`);
        }
      } catch (error) {
        errorCount++;
        console.error('Error updating book:', error);
      }
    }

    setIsApplying(false);

    // Show result banner
    if (errorCount === 0) {
      setBanner({ type: 'added', message: `Success! Updated ${successCount} book(s)` });
    } else {
      setBanner({ type: 'error', message: `Updated ${successCount}, failed ${errorCount}` });
    }

    setTimeout(() => {
      onClose(); // Close and refresh
    }, 2000);
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
          {config.mode === 'add' ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-blue-700">{stats.scanned}</div>
                <div className="text-sm text-blue-600">Scanned</div>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-green-700">{stats.added || 0}</div>
                <div className="text-sm text-green-600">Added</div>
              </div>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-yellow-700">{stats.duplicates || 0}</div>
                <div className="text-sm text-yellow-600">Duplicates</div>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-red-700">{stats.errors}</div>
                <div className="text-sm text-red-600">Errors</div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-blue-700">{stats.scanned}</div>
                <div className="text-sm text-blue-600">Scanned</div>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-green-700">{stats.found || 0}</div>
                <div className="text-sm text-green-600">Found</div>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-red-700">{stats.notFound || 0}</div>
                <div className="text-sm text-red-600">Not Found</div>
              </div>
            </div>
          )}

          {/* Edit Mode: Review Changes Button */}
          {config.mode === 'edit' && foundBooks.length > 0 && (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => setShowReview(true)}
                className="px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 font-medium min-h-[44px] touch-manipulation"
              >
                Review & Apply Changes ({foundBooks.length} book{foundBooks.length !== 1 ? 's' : ''})
              </button>
            </div>
          )}

          {/* Edit Defaults Toggle */}
          {config.mode === 'add' && (
            <div className="flex justify-between items-center">
              <button
                type="button"
                onClick={() => setShowDefaultsEditor(!showDefaultsEditor)}
                className="text-purple-600 hover:text-purple-700 font-medium text-sm"
              >
                {showDefaultsEditor ? '▼ Hide' : '▶ Edit'} Default Values
              </button>
            </div>
          )}

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

      {/* Review Screen Modal - Edit Mode Only */}
      {config.mode === 'edit' && showReview && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 space-y-4">
              {/* Review Header */}
              <div className="flex justify-between items-center border-b pb-4">
                <h2 className="text-2xl font-bold text-gray-900">Review Changes</h2>
                <button
                  type="button"
                  onClick={() => setShowReview(false)}
                  className="text-gray-400 hover:text-gray-600"
                  aria-label="Close"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Statistics Summary */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm font-medium text-blue-900">
                  {foundBooks.length} book{foundBooks.length !== 1 ? 's' : ''} ready to update
                  {notFoundISBNs.length > 0 && `, ${notFoundISBNs.length} not found`}
                </p>
              </div>

              {/* Found Books */}
              {foundBooks.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    ✓ Found Books ({foundBooks.length})
                  </h3>
                  <div className="space-y-3 max-h-[400px] overflow-y-auto">
                    {foundBooks.map((book) => (
                      <div key={book.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h4 className="font-semibold text-gray-900">{book.title}</h4>
                            {book.author && <p className="text-sm text-gray-600">{book.author}</p>}
                            <p className="text-xs text-gray-500 mt-1">ISBN: {book.isbn}</p>
                          </div>
                        </div>
                        {book.changes.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-gray-100">
                            <p className="text-xs font-medium text-gray-700 mb-2">Changes:</p>
                            <ul className="space-y-1">
                              {book.changes.map((change, idx) => (
                                <li key={idx} className="text-sm text-blue-700 flex items-start gap-2">
                                  <span className="text-blue-500 mt-0.5">→</span>
                                  <span>{change}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Not Found ISBNs */}
              {notFoundISBNs.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold text-red-900 mb-3">
                    ⚠ Not Found ({notFoundISBNs.length})
                  </h3>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-sm text-red-800 mb-2">
                      These ISBNs were not found in your library:
                    </p>
                    <ul className="space-y-1">
                      {notFoundISBNs.map((isbn) => (
                        <li key={isbn} className="text-sm text-red-700 font-mono">
                          • {isbn}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowReview(false)}
                  disabled={isApplying}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md font-medium min-h-[44px] disabled:opacity-50"
                >
                  Continue Scanning
                </button>
                <button
                  type="button"
                  onClick={applyBatchChanges}
                  disabled={isApplying || foundBooks.length === 0}
                  className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium min-h-[44px] touch-manipulation"
                >
                  {isApplying ? 'Applying Changes...' : `Apply All Changes (${foundBooks.length})`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
