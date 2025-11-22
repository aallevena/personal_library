'use client';

import { useState, useEffect } from 'react';
import { Container, ContainerFormData } from '../../types/container';
import { User } from '../../types/user';
import TagInput from './TagInput';

interface AddContainerFormProps {
  container?: Container | null;
  onSuccess: (container: Container) => void;
  onCancel: () => void;
}

export default function AddContainerForm({ container, onSuccess, onCancel }: AddContainerFormProps) {
  const [formData, setFormData] = useState<ContainerFormData>({
    name: container?.name || '',
    owner: container?.owner || '',
    tags: container?.tags || '',
    location: container?.location || '',
    parent_container_id: container?.parent_container_id || '',
  });

  const [users, setUsers] = useState<User[]>([]);
  const [containers, setContainers] = useState<Container[]>([]);
  const [householdContainer, setHouseholdContainer] = useState<Container | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Fetch users and containers for dropdowns
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [usersRes, containersRes] = await Promise.all([
          fetch('/api/users'),
          fetch('/api/containers')
        ]);

        const usersData = await usersRes.json();
        const containersData = await containersRes.json();

        if (usersData.success) {
          setUsers(usersData.users);
          // Set default owner to Alleven Family if creating new container
          if (!container) {
            setFormData(prev => ({ ...prev, owner: 'Alleven Family' }));
          }
        }

        if (containersData.success) {
          // Find household container
          const household = containersData.containers.find((c: Container) => c.is_household);
          setHouseholdContainer(household || null);

          // Set default parent to Household if creating new container
          if (!container && household) {
            setFormData(prev => ({ ...prev, parent_container_id: household.id }));
          }

          // Filter out current container from parent options (keep Household)
          const availableContainers = containersData.containers.filter(
            (c: Container) => c.id !== container?.id
          );
          setContainers(availableContainers);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
  }, [container]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setSubmitting(true);

    try {
      const url = container ? `/api/containers/${container.id}` : '/api/containers';
      const method = container ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          parent_container_id: formData.parent_container_id || undefined,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        onSuccess(data.container);
      } else {
        if (response.status >= 400 && response.status < 500) {
          setSubmitError(data.error || 'Invalid request. Please check your input.');
        } else if (response.status >= 500) {
          setSubmitError('Something went wrong. Please try again.');
        } else {
          setSubmitError(data.error || 'Failed to save container.');
        }
      }
    } catch (error) {
      console.error('Error submitting container:', error);
      setSubmitError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-900">
              {container ? 'Edit Container' : 'Add New Container'}
            </h2>
            <button
              type="button"
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Submit Error Message */}
          {submitError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{submitError}</p>
            </div>
          )}

          {/* Name Field */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Name *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              required
              value={formData.name}
              onChange={handleInputChange}
              placeholder="books we haven't read yet"
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Owner Field */}
          <div>
            <label htmlFor="owner" className="block text-sm font-medium text-gray-700">
              Owner *
            </label>
            <select
              id="owner"
              name="owner"
              required
              value={formData.owner}
              onChange={handleInputChange}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {users.map(user => (
                <option key={user.id} value={user.name}>
                  {user.name}
                </option>
              ))}
            </select>
          </div>

          {/* Location Field */}
          <div>
            <label htmlFor="location" className="block text-sm font-medium text-gray-700">
              Location
            </label>
            <input
              type="text"
              id="location"
              name="location"
              value={formData.location}
              onChange={handleInputChange}
              placeholder="e.g. my house, basement"
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Tags Field */}
          <TagInput
            value={formData.tags || ''}
            onChange={(value) => setFormData(prev => ({ ...prev, tags: value }))}
            label="Tags"
            id="tags"
          />

          {/* Parent Container Field */}
          <div>
            <label htmlFor="parent_container_id" className="block text-sm font-medium text-gray-700">
              Parent Container (optional)
            </label>
            <select
              id="parent_container_id"
              name="parent_container_id"
              value={formData.parent_container_id}
              onChange={handleInputChange}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">None (top-level)</option>
              {containers.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">
              Nest this container inside another container
            </p>
          </div>

          {/* Shareable Code Display (edit mode only) */}
          {container && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-sm font-medium text-gray-700 mb-1">Shareable Link:</p>
              <p className="text-sm text-blue-600 font-mono break-all">
                {window.location.origin}/lfl/{container.shareable_code}
              </p>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex justify-end gap-4 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !formData.name.trim() || !formData.owner.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
            >
              {submitting ? (container ? 'Saving...' : 'Creating...') : (container ? 'Save Changes' : 'Create Container')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
