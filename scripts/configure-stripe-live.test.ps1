#requires -Version 7.0
# All credentials below are deliberately fake fixtures. All provider calls are stubbed.
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$helper = Join-Path $PSScriptRoot 'configure-stripe-live.ps1'
$passed = 0
$failed = 0
$cases = @(
    @{ Name = 'verify-only'; Ok = $true },
    @{ Name = 'wrong-account'; Patch = @{ id = 'acct_OTHER' } },
    @{ Name = 'sandbox'; Expected = 'acct_1USJ2G7k4A7HyNzJ' },
    @{ Name = 'test-key'; Key = 'rk_test_FAKEFIXTURE' },
    @{ Name = 'wrong-country'; Patch = @{ country = 'US' } },
    @{ Name = 'wrong-currency'; Patch = @{ default_currency = 'usd' } },
    @{ Name = 'charges-disabled'; Patch = @{ charges_enabled = $false } },
    @{ Name = 'safe-staging'; Ok = $true; Store = $true },
    @{ Name = 'webhook-staging'; Ok = $true; Store = $true; Webhook = $true },
    @{ Name = 'webhook-test-mode'; Webhook = $true; EndpointPatch = @{ livemode = $false } },
    @{ Name = 'webhook-url'; Webhook = $true; EndpointPatch = @{ url = 'https://example.invalid/api/webhooks/stripe' } },
    @{ Name = 'webhook-events'; Webhook = $true; EndpointPatch = @{ enabled_events = @('checkout.session.completed') } },
    @{ Name = 'webhook-api-pin'; Webhook = $true; EndpointPatch = @{ api_version = '2020-08-27' } },
    @{ Name = 'webhook-disabled'; Webhook = $true; EndpointPatch = @{ status = 'disabled' } },
    @{ Name = 'stripe-network-failure'; NetworkFail = $true },
    @{ Name = 'vercel-failure'; Store = $true; VercelFail = $true },
    @{ Name = 'verbose-rejected'; VerboseFlag = $true },
    @{ Name = 'vercel-failure-write-2'; Store = $true; Webhook = $true; FailAt = 2 },
    @{ Name = 'vercel-failure-write-3'; Store = $true; Webhook = $true; FailAt = 3 },
    @{ Name = 'vercel-failure-write-4'; Store = $true; Webhook = $true; FailAt = 4 },
    @{ Name = 'vercel-failure-write-5'; Store = $true; Webhook = $true; FailAt = 5 },
    @{ Name = 'vercel-failure-write-6'; Store = $true; Webhook = $true; FailAt = 6 },
    @{ Name = 'vercel-six-write-boundary'; Ok = $true; Store = $true; Webhook = $true; FailAt = 7 }
)

foreach ($case in $cases) {
    foreach ($field in @('Ok','Store','Webhook','NetworkFail','VercelFail','FailAt','VerboseFlag','Expected','Key','Patch','EndpointPatch')) {
        if (!$case.ContainsKey($field)) { $case[$field] = $null }
    }
    $fixture = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes(($case | ConvertTo-Json -Depth 10 -Compress)))
    $escapedHelper = $helper.Replace("'", "''")
    $source = @'
$ErrorActionPreference = 'Stop'
$case = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('__FIXTURE__')) | ConvertFrom-Json -AsHashtable
$global:staged = [Collections.Generic.List[object]]::new()
$global:leakedArgument = $false
$global:requests = 0
function Read-Host {
    param($Prompt, [switch]$AsSecureString)
    $value = if ($Prompt -like 'Signing*') { 'whsec_FAKEFIXTURE' } elseif ($case.Key) { $case.Key } else { 'rk_live_FAKEFIXTURE' }
    ConvertTo-SecureString $value -AsPlainText -Force
}
function Stop-Transcript { throw 'No transcript' }
function Test-Path { return $false }
function Invoke-RestMethod {
    param($Uri, $Method, $Headers, $Verbose, $Debug)
    $global:requests++
    if ($case.NetworkFail) { throw 'rk_live_FAKEFIXTURE provider error must stay private' }
    if ($Method -ne 'Get' -or $Headers['Stripe-Version'] -ne '2026-09-30.endive' -or $Headers.Authorization -ne 'Bearer rk_live_FAKEFIXTURE') { throw 'Unexpected request' }
    if ($Uri -eq 'https://api.stripe.com/v1/account') {
        $value = @{ id = 'acct_FIXTURE'; country = 'AU'; default_currency = 'aud'; charges_enabled = $true }
        if ($case.Patch) { foreach ($entry in $case.Patch.GetEnumerator()) { $value[$entry.Key] = $entry.Value } }
    } elseif ($Uri -eq 'https://api.stripe.com/v1/webhook_endpoints/we_FIXTURE') {
        $value = @{ url = 'https://www.freshstop.com.au/api/webhooks/stripe'; livemode = $true; status = 'enabled'; api_version = '2026-09-30.endive'; enabled_events = @('checkout.session.completed','checkout.session.async_payment_succeeded','checkout.session.async_payment_failed','checkout.session.expired','payment_intent.payment_failed','charge.refunded') }
        if ($case.EndpointPatch) { foreach ($entry in $case.EndpointPatch.GetEnumerator()) { $value[$entry.Key] = $entry.Value } }
    } else { throw 'Unexpected network destination' }
    [pscustomobject]$value
}
function vercel {
    process {
        if (($args -join ' ') -match 'FAKEFIXTURE') { $global:leakedArgument = $true }
        $item = $_ | ConvertFrom-Json
        $global:staged.Add([pscustomobject]@{ name = $item.key; value = if ($item.key -match 'SECRET') { '[redacted-fixture]' } else { $item.value }; target = $item.target; type = $item.type })
        $global:LASTEXITCODE = if ($case.VercelFail -or ($case.FailAt -and $global:staged.Count -eq $case.FailAt)) { 1 } else { 0 }
    }
}
$params = @{ ExpectedAccountId = if ($case.Expected) { $case.Expected } else { 'acct_FIXTURE' } }
if ($case.Store) { $params.StoreInVercel = $true }
if ($case.Webhook) { $params.WebhookEndpointId = 'we_FIXTURE' }
if ($case.VerboseFlag) { $params.Verbose = $true }
$global:LASTEXITCODE = 0
try { & '__HELPER__' @params }
finally { 'MOCK_STATE:' + (@{ staged = @($global:staged.ToArray()); leakedArgument = $global:leakedArgument; requests = $global:requests } | ConvertTo-Json -Compress -Depth 6) }
exit $global:LASTEXITCODE
'@
    $source = $source.Replace('__FIXTURE__', $fixture).Replace('__HELPER__', $escapedHelper)
    $encoded = [Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($source))
    $output = @(& (Join-Path $PSHOME $(if ($IsWindows) { 'pwsh.exe' } else { 'pwsh' })) -NoProfile -NonInteractive -EncodedCommand $encoded 2>&1)
    $code = $LASTEXITCODE
    $text = $output -join "`n"
    try {
        $stateLine = $output | Where-Object { "$_" -like 'MOCK_STATE:*' } | Select-Object -Last 1
        if (!$stateLine) { throw 'Missing mock state' }
        $state = "$stateLine".Substring(11) | ConvertFrom-Json
        if ($text -match 'FAKEFIXTURE' -or $state.leakedArgument) { throw 'Fixture credential leaked' }
        if ($case.Ok) {
            if ($code -ne 0 -or $text -notmatch 'Verified live-key account') { throw 'Expected verification success' }
        } elseif ($code -ne 1 -or $text -notmatch 'BLOCKED:') { throw 'Expected fail-closed exit' }
        if (!$case.Store -or (!$case.Ok -and !$case.VercelFail -and !$case.FailAt)) {
            if ($state.staged.Count -ne 0) { throw 'Unexpected write' }
        } elseif ($case.Ok) {
            $names = @($state.staged | ForEach-Object name)
            $expected = @('PAID_CHECKOUT_ENABLED','STRIPE_ALLOW_LIVE','STRIPE_MODE','STRIPE_EXPECTED_ACCOUNT','STRIPE_SECRET_KEY')
            if ($case.Webhook) { $expected += 'STRIPE_WEBHOOK_SECRET' }
            if (($names -join ',') -ne ($expected -join ',')) { throw 'Unsafe staging order' }
            if ($state.staged[0].value -ne 'false' -or $state.staged[1].value -ne 'false') { throw 'Payment gate enabled' }
            foreach ($item in $state.staged) { if (($item.target -join ',') -ne 'production') { throw 'Wrong deployment target' } }
            if ($state.staged[4].type -ne 'sensitive') { throw 'Secret storage type mismatch' }
        }
        if ($case.VercelFail -and ($state.staged.Count -ne 1 -or $state.staged[0].name -ne 'PAID_CHECKOUT_ENABLED')) { throw 'Staging continued after failure' }
        if ($case.FailAt -and !$case.Ok) {
            if ($state.staged.Count -ne $case.FailAt) { throw 'Staging continued after failed write' }
            if ($state.staged[0].name -ne 'PAID_CHECKOUT_ENABLED' -or $state.staged[0].value -ne 'false' -or
                $state.staged[1].name -ne 'STRIPE_ALLOW_LIVE' -or $state.staged[1].value -ne 'false') { throw 'Closed gate prefix not preserved' }
            $expectedPrefix = @('PAID_CHECKOUT_ENABLED','STRIPE_ALLOW_LIVE','STRIPE_MODE','STRIPE_EXPECTED_ACCOUNT','STRIPE_SECRET_KEY','STRIPE_WEBHOOK_SECRET') | Select-Object -First $case.FailAt
            if ((($state.staged | ForEach-Object name) -join ',') -ne ($expectedPrefix -join ',')) { throw 'Partial staging order mismatch' }
        }
        if ($case.Webhook -and $case.Ok -and $text -notmatch 'signing secret and signed delivery remain unverified') { throw 'Signing verification falsely claimed' }
        if (($case.Name -in @('sandbox','test-key','verbose-rejected')) -and $state.requests -ne 0) { throw 'Unexpected provider request' }
        $passed++
        Write-Output "PASS $($case.Name)"
    } catch {
        $failed++
        Write-Output "FAIL $($case.Name): $($_.Exception.Message)"
    }
}
Write-Output "$passed passed; $failed failed; all network and Vercel calls mocked."
if ($failed -gt 0) { exit 1 }
