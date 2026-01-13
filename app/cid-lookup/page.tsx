"use client";

import { useState } from "react";
import Link from "next/link";
import {
  FILECOIN_PAY_CONTRACT,
  SUBGRAPH_VERSION,
  NETWORK,
} from "@/lib/graphql/client";
import { lookupCIDMetadata, CIDLookupResult } from "@/lib/cid/fetchers";

// CID Lookup Page
export default function CIDLookupPage() {
  const [cidInput, setCidInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CIDLookupResult | null>(null);

  const handleLookup = async () => {
    if (!cidInput.trim()) {
      setError("Please enter a CID");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const lookupResult = await lookupCIDMetadata(cidInput.trim());
      setResult(lookupResult);

      if (!lookupResult.found) {
        setError(lookupResult.error || "CID not found in the network");
      }
    } catch (err) {
      console.error("CID lookup error:", err);
      setError("Failed to lookup CID. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleLookup();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with back link */}
      <div className="flex items-center gap-4">
        <Link href="/" className="text-blue-600 hover:underline">
          ← Back to Dashboard
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold">CID Lookup</h1>
        <p className="text-gray-500 mt-1">
          Look up IPFS CID or commP to find Storage Provider and retrieval information
        </p>
      </div>

      {/* CID Input Section */}
      <div className="bg-white border rounded-lg p-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Enter IPFS CID or Piece CID (commP)
        </label>
        <div className="flex gap-4">
          <input
            type="text"
            value={cidInput}
            onChange={(e) => setCidInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi or baga..."
            className="flex-1 px-4 py-2 border rounded-md font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <button
            onClick={handleLookup}
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Looking up..." : "Lookup"}
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          Supports IPFS CIDv1 (bafy...) and Filecoin Piece CID (baga...)
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
          <p className="font-medium">Lookup Failed</p>
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Results Section */}
      {result && result.found && (
        <div className="space-y-6">
          {/* CID Information Card */}
          <div className="bg-white border rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">CID Information</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Input CID</p>
                <p className="font-mono text-sm break-all">{result.inputCID}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">CID Type</p>
                <p className="font-medium">{result.cidType}</p>
              </div>
              {result.commP && (
                <div className="col-span-2">
                  <p className="text-sm text-gray-500">Piece CID (commP)</p>
                  <p className="font-mono text-sm break-all">{result.commP}</p>
                </div>
              )}
              {result.dataSize && (
                <div>
                  <p className="text-sm text-gray-500">Data Size</p>
                  <p className="font-medium">{result.dataSize}</p>
                </div>
              )}
            </div>
          </div>

          {/* Storage Provider Information */}
          {result.storageProviders && result.storageProviders.length > 0 && (
            <div className="bg-white border rounded-lg p-6">
              <h2 className="text-lg font-semibold mb-4">Storage Providers</h2>
              <div className="space-y-4">
                {result.storageProviders.map((sp, index) => (
                  <div
                    key={sp.address}
                    className={`p-4 rounded-lg ${
                      index % 2 === 0 ? "bg-gray-50" : "bg-white"
                    }`}
                  >
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">Provider Address</p>
                        <p className="font-mono text-sm">
                          <a
                            href={`https://filfox.info/en/address/${sp.address}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            {sp.address}
                          </a>
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Status</p>
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            sp.isActive
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {sp.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>
                      {sp.dataSize && (
                        <div>
                          <p className="text-sm text-gray-500">Total Data Stored</p>
                          <p className="font-medium">{sp.dataSize}</p>
                        </div>
                      )}
                      {sp.proofStatus && (
                        <div>
                          <p className="text-sm text-gray-500">Proof Status</p>
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              sp.proofStatus === "proven"
                                ? "bg-green-100 text-green-800"
                                : sp.proofStatus === "stale"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {sp.proofStatus === "proven"
                              ? "Proofs Current"
                              : sp.proofStatus === "stale"
                              ? "Proofs Stale"
                              : "Unknown"}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Retrieval URL */}
                    {sp.retrievalUrl && (
                      <div className="mt-4 pt-4 border-t">
                        <p className="text-sm text-gray-500 mb-2">Retrieval URL</p>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 bg-gray-100 px-3 py-2 rounded text-sm font-mono break-all">
                            {sp.retrievalUrl}
                          </code>
                          <button
                            onClick={() => navigator.clipboard.writeText(sp.retrievalUrl!)}
                            className="px-3 py-2 bg-gray-200 rounded hover:bg-gray-300 text-sm"
                            title="Copy to clipboard"
                          >
                            Copy
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No providers found */}
          {(!result.storageProviders || result.storageProviders.length === 0) && (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg">
              <p className="font-medium">No Storage Providers Found</p>
              <p className="text-sm">
                This CID is not currently tracked by any known storage providers in the PDP network.
              </p>
            </div>
          )}
        </div>
      )}

      {/* How it works section */}
      <div className="bg-gray-50 border rounded-lg p-6">
        <h3 className="text-md font-semibold mb-3">How CID Lookup Works</h3>
        <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
          <li>Enter an IPFS CID or Filecoin Piece CID (commP)</li>
          <li>The system queries the PDP subgraph for associated DataSets</li>
          <li>Storage Providers storing this piece are identified</li>
          <li>Retrieval URLs are constructed based on SP endpoints</li>
        </ol>
        <p className="text-xs text-gray-400 mt-4">
          Note: IPFS CID to commP mapping requires the content to be indexed. Some CIDs may not be
          found if they haven&apos;t been onboarded through the Filecoin Pay network.
        </p>
      </div>

      {/* Data source indicator */}
      <div className="bg-gray-50 border rounded-lg p-4 space-y-2 text-sm">
        <div className="font-medium text-gray-700">Data Source</div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-gray-600">
          <div>Network:</div>
          <div className="font-mono">{NETWORK}</div>
          <div>Contract:</div>
          <div className="font-mono text-xs">
            <a
              href={`https://filfox.info/en/address/${FILECOIN_PAY_CONTRACT}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              {FILECOIN_PAY_CONTRACT}
            </a>
          </div>
          <div>Subgraph Version:</div>
          <div className="font-mono">{SUBGRAPH_VERSION}</div>
        </div>
      </div>
    </div>
  );
}
