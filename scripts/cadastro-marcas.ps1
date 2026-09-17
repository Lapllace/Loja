# Cadastra as marcas necessárias via POST /api/brands (endpoint existente).
# Uso: & scripts/cadastro-marcas.ps1

$ErrorActionPreference = 'Stop'
$base = 'http://localhost:3000/api'
$token = (Get-Content "$PSScriptRoot/../backend/.tmp-token.txt" -Raw).Trim()
$headers = @{ Authorization = "Bearer $token" }

# Nomes exatamente como informados na lista de produtos (inclui o alpha grego em α'GOLD).
$marcas = @(
  @{ name = 'Kaidi';    slug = 'kaidi';    description = 'Acessorios e audio.' }
  @{ name = "α'GOLD"; slug = 'agold';    description = 'Acessorios para celular.' }
  @{ name = 'Basike';   slug = 'basike';   description = 'Carregadores.' }
  @{ name = "H'Maston"; slug = 'hmaston';  description = 'Audio.' }
  @{ name = 'Microwear';slug = 'microwear';description = 'Smartwatches.' }
  @{ name = 'XBO';      slug = 'xbo';      description = 'Smartwatches.' }
  @{ name = 'HW';       slug = 'hw';       description = 'Smartwatches.' }
)

foreach ($m in $marcas) {
  $body = $m | ConvertTo-Json -Compress
  $bytes = [System.Text.Encoding]::UTF8.GetBytes($body)
  try {
    $r = Invoke-RestMethod -Uri "$base/brands" -Method Post -Headers $headers -Body $bytes -ContentType 'application/json; charset=utf-8'
    Write-Output ("CREATED " + $r.slug + " -> " + $r.name)
  } catch {
    Write-Output ("ERROR " + $m.slug + " -> " + $_.Exception.Message)
  }
}
