'use client';

import { ExternalLink, Globe, HardDrive, Clock, DollarSign, CheckCircle, XCircle } from 'lucide-react';
import type { SPRegistryEnrichment, ParsedLocation } from '@/lib/sp-registry/types';

/**
 * Format location for display.
 * Returns "City, Country" or best available format.
 */
function formatLocation(location: ParsedLocation): string {
  if (location.city && location.country) {
    return `${location.city}, ${location.country}`;
  } else if (location.city) {
    return location.city;
  } else if (location.state && location.country) {
    return `${location.state}, ${location.country}`;
  } else if (location.country) {
    return location.country;
  }
  return location.raw || 'Unknown';
}

interface SPHeroProps {
  data: SPRegistryEnrichment;
  loading?: boolean;
}

/**
 * Loading skeleton for SP Hero section.
 */
function SPHeroSkeleton() {
  return (
    <div className="bg-purple-50 border border-purple-200 rounded-lg p-6 animate-pulse">
      <div className="flex items-start justify-between">
        <div className="space-y-3 flex-1">
          <div className="h-6 bg-purple-200 rounded w-48" />
          <div className="h-4 bg-purple-200 rounded w-32" />
        </div>
        <div className="h-6 w-16 bg-purple-200 rounded-full" />
      </div>
      <div className="grid grid-cols-4 gap-4 mt-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-3 bg-purple-200 rounded w-20" />
            <div className="h-5 bg-purple-200 rounded w-24" />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Unregistered SP fallback display.
 * Shows when payee address is not found in SP Registry.
 */
function UnregisteredSP() {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
          <XCircle className="w-5 h-5 text-gray-400" />
        </div>
        <div>
          <p className="text-sm font-medium text-gray-600">Unregistered Storage Provider</p>
          <p className="text-xs text-gray-500">
            This payee is not registered in the SP Registry
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * SP Hero section displaying Storage Provider registry information.
 * Shows provider name, location, status, and service details.
 */
export function SPHero({ data, loading }: SPHeroProps) {
  if (loading) {
    return <SPHeroSkeleton />;
  }

  if (!data.isRegistered) {
    return <UnregisteredSP />;
  }

  return (
    <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
      {/* Header Row: Name + Status */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-purple-900">{data.name || 'Unknown Provider'}</h2>
            {data.active && (
              <CheckCircle className="w-5 h-5 text-green-500" />
            )}
          </div>
          {data.location && (
            <p className="text-sm text-purple-600 mt-1 flex items-center gap-1">
              <Globe className="w-4 h-4" />
              {formatLocation(data.location)}
            </p>
          )}
          {data.description && (
            <p className="text-sm text-purple-500 mt-1 max-w-2xl">{data.description}</p>
          )}
        </div>
        <span
          className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
            data.active
              ? 'bg-green-100 text-green-800'
              : 'bg-gray-100 text-gray-600'
          }`}
        >
          {data.active ? 'Active' : 'Inactive'}
        </span>
      </div>

      {/* Service Details Grid */}
      <div className="grid grid-cols-4 gap-4 mt-6">
        {/* Service URL */}
        <div>
          <p className="text-xs text-purple-500 uppercase tracking-wide">Service URL</p>
          {data.serviceURL ? (
            <a
              href={data.serviceURL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-purple-700 hover:text-purple-900 hover:underline flex items-center gap-1 mt-1"
            >
              {new URL(data.serviceURL).hostname}
              <ExternalLink className="w-3 h-3" />
            </a>
          ) : (
            <p className="text-sm text-purple-700 mt-1">-</p>
          )}
        </div>

        {/* Storage Pricing */}
        <div>
          <p className="text-xs text-purple-500 uppercase tracking-wide flex items-center gap-1">
            <DollarSign className="w-3 h-3" />
            Storage Price
          </p>
          <p className="text-sm font-medium text-purple-700 mt-1">
            {data.storagePriceDisplay || '-'}
          </p>
        </div>

        {/* Piece Size Range */}
        <div>
          <p className="text-xs text-purple-500 uppercase tracking-wide flex items-center gap-1">
            <HardDrive className="w-3 h-3" />
            Piece Size
          </p>
          <p className="text-sm font-medium text-purple-700 mt-1">
            {data.pieceSizeRange || '-'}
          </p>
        </div>

        {/* Proving Period */}
        <div>
          <p className="text-xs text-purple-500 uppercase tracking-wide flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Proving Period
          </p>
          <p className="text-sm font-medium text-purple-700 mt-1">
            {data.provingPeriod || '-'}
          </p>
        </div>
      </div>

      {/* Data Source Footer */}
      <div className="mt-4 pt-4 border-t border-purple-200">
        <p className="text-xs text-purple-400">
          Data from{' '}
          <a
            href="https://www.filecoin.services/providers"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-purple-600"
          >
            SP Registry
          </a>
        </p>
      </div>
    </div>
  );
}

export { SPHeroSkeleton, UnregisteredSP };
