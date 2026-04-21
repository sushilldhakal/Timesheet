"use client"

import { useState, useEffect } from "react"
import { useApiKeys, useCreateApiKey, useRevokeApiKey, type ApiKeyRecord } from "@/lib/hooks/use-api-keys"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { FormDialogShell } from "@/components/shared/forms/FormDialogShell"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { ConfirmDialogShell } from "@/components/shared/forms"
import { Skeleton } from "@/components/ui/skeleton"
import { Key, Plus, Copy, Check, Trash2, AlertTriangle } from "lucide-react"
import { format } from "date-fns"
import { toast } from "sonner"

const ALL_SCOPES = [
  { value: "employees:read", label: "Employees — Read" },
  { value: "employees:write", label: "Employees — Write" },
  { value: "shifts:read", label: "Shifts — Read" },
  { value: "shifts:write", label: "Shifts — Write" },
  { value: "timesheets:read", label: "Timesheets — Read" },
  { value: "rosters:read", label: "Rosters — Read" },
  { value: "payroll:read", label: "Payroll — Read" },
  { value: "webhooks:manage", label: "Webhooks — Manage" },
] as const

const EXPIRY_OPTIONS = [
  { value: "30", label: "30 days" },
  { value: "90", label: "90 days" },
  { value: "365", label: "1 year" },
  { value: "never", label: "Never expires" },
]

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Button variant="outline" size="sm" onClick={handleCopy}>
      {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
      {copied ? "Copied" : "Copy"}
    </Button>
  )
}

function CreateKeyDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (key: string) => void
}) {
  const [name, setName] = useState("")
  const [selectedScopes, setSelectedScopes] = useState<string[]>([])
  const [expiresIn, setExpiresIn] = useState("never")
  const createKey = useCreateApiKey()

  const toggleScope = (scope: string) => {
    setSelectedScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]
    )
  }

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error("Name is required")
      return
    }
    if (selectedScopes.length === 0) {
      toast.error("Select at least one scope")
      return
    }

    const expiresAt =
      expiresIn !== "never"
        ? new Date(Date.now() + parseInt(expiresIn) * 24 * 60 * 60 * 1000).toISOString()
        : undefined

    createKey.mutate(
      { name: name.trim(), scopes: selectedScopes, expiresAt },
      {
        onSuccess: (data) => {
          onCreated(data.key)
          onOpenChange(false)
          setName("")
          setSelectedScopes([])
          setExpiresIn("never")
        },
      }
    )
  }

  return (
    <FormDialogShell
      open={open}
      onOpenChange={onOpenChange}
      title="Create API Key"
      description="The key will be shown once after creation. Store it securely."
      onSubmit={(e) => {
        e.preventDefault();
        handleCreate();
      }}
      submitLabel={createKey.isPending ? "Creating..." : "Create Key"}
      loading={createKey.isPending}
      size="md"
    >
      <div className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="key-name">Name</Label>
          <Input
            id="key-name"
            placeholder="e.g. Xero Integration"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Scopes</Label>
          <div className="grid grid-cols-1 gap-2 rounded-lg border p-3">
            {ALL_SCOPES.map((scope) => (
              <div key={scope.value} className="flex items-center gap-2">
                <Checkbox
                  id={scope.value}
                  checked={selectedScopes.includes(scope.value)}
                  onCheckedChange={() => toggleScope(scope.value)}
                />
                <label htmlFor={scope.value} className="text-sm cursor-pointer">
                  {scope.label}
                </label>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Expires In</Label>
          <Select value={expiresIn} onValueChange={setExpiresIn}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EXPIRY_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </FormDialogShell>
  )
}

function NewKeyRevealDialog({
  apiKey,
  onClose,
}: {
  apiKey: string
  onClose: () => void
}) {
  return (
    <FormDialogShell
      open={!!apiKey}
      onOpenChange={(open) => !open && onClose()}
      title="API Key Created"
      description="Copy this key now. It will not be shown again."
      size="md"
    >
      <div className="space-y-3">
        <div className="flex items-center gap-2 rounded-lg bg-muted p-3">
          <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0" />
          <p className="text-xs text-muted-foreground">
            Store this key securely. You cannot retrieve it after closing this dialog.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <code className="flex-1 rounded bg-muted px-3 py-2 text-xs font-mono break-all">
            {apiKey}
          </code>
          <CopyButton text={apiKey} />
        </div>
      </div>
    </FormDialogShell>
  )
}

function KeyRow({ apiKey }: { apiKey: ApiKeyRecord }) {
  const [revokeOpen, setRevokeOpen] = useState(false)
  const revokeKey = useRevokeApiKey()

  const isExpired = apiKey.expiresAt ? new Date(apiKey.expiresAt) < new Date() : false

  return (
    <>
      <tr className="hover:bg-muted/30 transition-colors">
        <td className="px-4 py-3">
          <div>
            <p className="font-medium">{apiKey.name}</p>
            <p className="text-xs text-muted-foreground font-mono mt-0.5">{apiKey.keyPrefix}…</p>
          </div>
        </td>
        <td className="px-4 py-3">
          <div className="flex flex-wrap gap-1">
            {apiKey.scopes.slice(0, 3).map((scope) => (
              <Badge key={scope} variant="secondary" className="text-xs">
                {scope}
              </Badge>
            ))}
            {apiKey.scopes.length > 3 && (
              <Badge variant="secondary" className="text-xs">
                +{apiKey.scopes.length - 3}
              </Badge>
            )}
          </div>
        </td>
        <td className="px-4 py-3 text-sm text-muted-foreground">
          {format(new Date(apiKey.createdAt), "MMM d, yyyy")}
        </td>
        <td className="px-4 py-3 text-sm text-muted-foreground">
          {apiKey.lastUsedAt ? format(new Date(apiKey.lastUsedAt), "MMM d, yyyy") : "Never"}
        </td>
        <td className="px-4 py-3 text-sm text-muted-foreground">
          {apiKey.expiresAt ? format(new Date(apiKey.expiresAt), "MMM d, yyyy") : "Never"}
        </td>
        <td className="px-4 py-3">
          {isExpired ? (
            <Badge variant="destructive">Expired</Badge>
          ) : (
            <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
              Active
            </Badge>
          )}
        </td>
        <td className="px-4 py-3 text-right">
          <Button
            variant="ghost"
            size="sm"
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={() => setRevokeOpen(true)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </td>
      </tr>

      <ConfirmDialogShell
        open={revokeOpen}
        onOpenChange={setRevokeOpen}
        title="Revoke API Key"
        description={
          <>
            This will permanently revoke <strong>{apiKey.name}</strong>. Any integrations using
            this key will stop working immediately.
          </>
        }
        onConfirm={() => revokeKey.mutate(apiKey._id)}
        confirmLabel="Revoke Key"
        loading={revokeKey.isPending}
        variant="destructive"
      />
    </>
  )
}

export default function ApiKeysPage() {
  const { data: keys = [], isLoading } = useApiKeys()
  const [createOpen, setCreateOpen] = useState(false)
  const [newKey, setNewKey] = useState("")
  const [isMounted, setIsMounted] = useState(false)

  // Prevent hydration mismatch by only rendering after mount
  useEffect(() => {
    setIsMounted(true)
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">API Keys</h1>
          <p className="text-muted-foreground text-sm">
            Create API keys for machine-to-machine integrations
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create New Key
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Key className="h-4 w-4" />
            Active Keys
          </CardTitle>
          <CardDescription>
            Keys are hashed and stored securely. The plaintext key is only shown once at creation.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {!isMounted || isLoading ? (
            <div className="space-y-3 p-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : keys.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Key className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="font-medium">No API keys yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Create a key to enable machine-to-machine integrations
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium">Name</th>
                    <th className="text-left px-4 py-3 font-medium">Scopes</th>
                    <th className="text-left px-4 py-3 font-medium">Created</th>
                    <th className="text-left px-4 py-3 font-medium">Last Used</th>
                    <th className="text-left px-4 py-3 font-medium">Expires</th>
                    <th className="text-left px-4 py-3 font-medium">Status</th>
                    <th className="text-right px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {keys.map((key) => (
                    <KeyRow key={key._id} apiKey={key} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <CreateKeyDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(key) => setNewKey(key)}
      />

      {newKey && (
        <NewKeyRevealDialog apiKey={newKey} onClose={() => setNewKey("")} />
      )}
    </div>
  )
}
