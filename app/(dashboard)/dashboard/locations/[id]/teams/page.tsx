"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Users, Calendar } from "lucide-react"
import { format } from "date-fns"
import {
  useLocation,
  useLocationTeams,
  useEnableLocationTeam,
  useDisableLocationTeam,
} from "@/lib/queries/locations"
import { useTeams } from "@/lib/queries/teams"

function LocationTeamsPage() {
  const params = useParams()
  const router = useRouter()
  const locationId = params?.id as string

  const [toggling, setToggling] = useState<string | null>(null)

  const locationQuery = useLocation(locationId)
  const allTeamsQuery = useTeams()
  const locationTeamsQuery = useLocationTeams(locationId)
  const enableLocationTeamMutation = useEnableLocationTeam()
  const disableLocationTeamMutation = useDisableLocationTeam()

  const location = locationQuery.data?.location
  const allTeams = allTeamsQuery.data?.teams || []
  const teams = locationTeamsQuery.data?.teams || []
  const loading =
    locationQuery.isLoading || allTeamsQuery.isLoading || locationTeamsQuery.isLoading
  const error =
    (locationQuery.error as Error | null)?.message ||
    (allTeamsQuery.error as Error | null)?.message ||
    (locationTeamsQuery.error as Error | null)?.message

  const handleToggle = async (teamId: string, currentlyEnabled: boolean) => {
    setToggling(teamId)
    try {
      if (currentlyEnabled) {
        await disableLocationTeamMutation.mutateAsync({ locationId, teamId })
      } else {
        await enableLocationTeamMutation.mutateAsync({
          locationId,
          data: {
            teamId,
            effectiveFrom: new Date().toISOString(),
            effectiveTo: null,
          },
        })
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setToggling(null)
    }
  }

  const enabledTeamsMap = new Map(teams.map((t) => [t.teamId, t]))

  const mergedTeams = allTeams.map((team) => {
    const enablement = enabledTeamsMap.get(team.id)
    return {
      teamId: team.id,
      teamName: team.name,
      teamColor: team.color,
      isEnabled: !!enablement,
      effectiveFrom: enablement?.effectiveFrom,
      effectiveTo: enablement?.effectiveTo ?? null,
      employeeCount: enablement?.employeeCount || 0,
    }
  })

  return (
    <div className="flex flex-col space-y-4 p-4 lg:p-8">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard/locations")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">
            {location?.name || "Location"} - Team management
          </h1>
          <p className="text-sm text-muted-foreground">
            Enable or disable teams for this location
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Available teams</CardTitle>
          <CardDescription>
            Toggle teams on or off for this location. Only enabled teams appear in scheduling.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-muted-foreground">Loading teams...</div>
          ) : error ? (
            <div className="py-8 text-center text-destructive">{error}</div>
          ) : mergedTeams.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No teams available. Create teams on the Category page first.
            </div>
          ) : (
            <div className="space-y-2">
              {mergedTeams.map((team) => (
                <div
                  key={team.teamId}
                  className="flex items-center justify-between rounded-lg border p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1">
                    {team.teamColor && (
                      <div
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: team.teamColor }}
                      />
                    )}

                    <div className="flex-1">
                      <div className="font-medium">{team.teamName}</div>
                      {team.isEnabled && team.effectiveFrom && (
                        <div className="text-xs text-muted-foreground mt-1 flex items-center gap-4">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Enabled: {format(new Date(team.effectiveFrom), "MMM d, yyyy")}
                            {team.effectiveTo && (
                              <> - {format(new Date(team.effectiveTo), "MMM d, yyyy")}</>
                            )}
                          </span>
                        </div>
                      )}
                    </div>

                    {team.isEnabled && (
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {team.employeeCount}{" "}
                        {team.employeeCount === 1 ? "employee" : "employees"}
                      </Badge>
                    )}

                    <Badge variant={team.isEnabled ? "default" : "outline"}>
                      {team.isEnabled ? "Enabled" : "Disabled"}
                    </Badge>
                  </div>

                  <Switch
                    checked={team.isEnabled}
                    onCheckedChange={() => handleToggle(team.teamId, team.isEnabled)}
                    disabled={toggling === team.teamId}
                    className="ml-4"
                  />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default LocationTeamsPage
