#requires -Version 7.0
[CmdletBinding()]
param(
    [Parameter(Mandatory)][ValidatePattern('^acct_[A-Za-z0-9]+$')][string]$ExpectedAccountId,
    [switch]$StoreInVercel,
    [ValidatePattern('^we_[A-Za-z0-9]+$')][string]$WebhookEndpointId
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$project = 'prj_VHcFHxX5ym4XfPQ2KUijnBZ0hTMg'
$team = 'team_cJFk6APDaky0rXTTZLj4xoWT'
$apiVersion = '2026-09-30.endive'
$key = $null
$webhookSecret = $null
$headers = $null
$account = $null
$endpoint = $null

function Read-PrivateValue([string]$Prompt) {
    $secure = Read-Host $Prompt -AsSecureString
    $pointer = [IntPtr]::Zero
    try {
        $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
        return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
    } finally {
        if ($pointer -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer) }
        $secure.Dispose()
    }
}

function Set-ProductionValue([string]$Name, [string]$Value, [string]$Type = 'encrypted') {
    $payload = @{ key = $Name; value = $Value; type = $Type; target = @('production') } | ConvertTo-Json -Compress
    try {
        # Values travel over stdin, never command arguments, environment variables, or files.
        $payload | & vercel api "/v10/projects/$project/env?teamId=$team&upsert=true" --method POST --input - --silent *> $null
        if ($LASTEXITCODE -ne 0) { throw 'Vercel configuration failed.' }
    } finally { $payload = $null; $Value = $null }
}

try {
    if ($VerbosePreference -ne 'SilentlyContinue' -or $DebugPreference -ne 'SilentlyContinue' -or
        $PSBoundParameters.ContainsKey('Verbose') -or $PSBoundParameters.ContainsKey('Debug')) { throw 'Unsafe logging.' }
    # Stop any interactive transcript before requesting secrets. Refuse managed transcription.
    foreach ($path in @('HKLM:\Software\Policies\Microsoft\Windows\PowerShell\Transcription', 'HKCU:\Software\Policies\Microsoft\Windows\PowerShell\Transcription')) {
        if (Test-Path $path) {
            $policy = Get-ItemProperty $path
            if ($policy.PSObject.Properties['EnableTranscripting'] -and $policy.EnableTranscripting -eq 1) { throw 'Managed transcription enabled.' }
        }
    }
    try { Stop-Transcript -ErrorAction Stop | Out-Null; throw 'An active transcript was stopped; restart in a private shell.' }
    catch { if ($_.Exception.Message -eq 'An active transcript was stopped; restart in a private shell.') { throw } }
    if ($ExpectedAccountId -eq 'acct_1USJ2G7k4A7HyNzJ') { throw 'Sandbox account is forbidden.' }
    if ($StoreInVercel) { Get-Command vercel -ErrorAction Stop | Out-Null }
    $key = Read-PrivateValue 'Rotated LIVE Stripe restricted/secret key (masked)'
    if ($key -notmatch '^(sk|rk)_live_[A-Za-z0-9]+$') { throw 'Live key required.' }
    $headers = @{ Authorization = "Bearer $key"; 'Stripe-Version' = $apiVersion }
    $account = Invoke-RestMethod -Uri 'https://api.stripe.com/v1/account' -Method Get -Headers $headers -Verbose:$false -Debug:$false
    if ($account.id -ne $ExpectedAccountId -or $account.country -ne 'AU' -or $account.default_currency -ne 'aud' -or $account.charges_enabled -ne $true) { throw 'Account verification failed.' }
    if ($WebhookEndpointId) {
        $endpoint = Invoke-RestMethod -Uri "https://api.stripe.com/v1/webhook_endpoints/$WebhookEndpointId" -Method Get -Headers $headers -Verbose:$false -Debug:$false
        $events = @('checkout.session.completed', 'checkout.session.async_payment_succeeded', 'checkout.session.async_payment_failed', 'checkout.session.expired', 'payment_intent.payment_failed', 'charge.refunded')
        if ($endpoint.url -ne 'https://www.freshstop.com.au/api/webhooks/stripe' -or $endpoint.livemode -ne $true -or $endpoint.status -ne 'enabled' -or $endpoint.api_version -ne $apiVersion) { throw 'Webhook configuration mismatch.' }
        foreach ($event in $events) { if ($endpoint.enabled_events -notcontains '*' -and $endpoint.enabled_events -notcontains $event) { throw 'Missing webhook event.' } }
        if ($StoreInVercel) {
            $webhookSecret = Read-PrivateValue 'Signing secret for this verified LIVE endpoint (masked)'
            if ($webhookSecret -notmatch '^whsec_[A-Za-z0-9]+$') { throw 'Signing secret format invalid.' }
        }
    }
    if ($StoreInVercel) {
        Set-ProductionValue 'PAID_CHECKOUT_ENABLED' 'false'
        Set-ProductionValue 'STRIPE_ALLOW_LIVE' 'false'
        Set-ProductionValue 'STRIPE_MODE' 'live'
        Set-ProductionValue 'STRIPE_EXPECTED_ACCOUNT' $ExpectedAccountId
        Set-ProductionValue 'STRIPE_SECRET_KEY' $key 'sensitive'
        if ($webhookSecret) { Set-ProductionValue 'STRIPE_WEBHOOK_SECRET' $webhookSecret 'sensitive' }
        Write-Output 'Production configuration staged with checkout disabled. No deployment performed.'
    }
    Write-Output "Verified live-key account: $ExpectedAccountId (AU/AUD, charges enabled)."
    if ($WebhookEndpointId) { Write-Output 'Webhook configuration verified; signing secret and signed delivery remain unverified.' }
} catch {
    Write-Output 'BLOCKED: verification or staging failed. No activation or deployment performed. Inspect configuration privately; partial staging may have occurred.'
    exit 1
} finally {
    $headers = $null; $key = $null; $webhookSecret = $null; $account = $null; $endpoint = $null
}
