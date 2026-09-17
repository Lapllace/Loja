# Cadastra as categorias necessárias via POST /api/categories (endpoint existente).
# Uso: powershell -File scripts/cadastro-categorias.ps1

$ErrorActionPreference = 'Stop'
$base = 'http://localhost:3000/api'
$token = (Get-Content "$PSScriptRoot/../backend/.tmp-token.txt" -Raw).Trim()
$headers = @{ Authorization = "Bearer $token" }

$categorias = @(
  @{ name = 'Carregadores';  slug = 'carregadores';  description = 'Carregadores de parede e kits com cabo para celular.' }
  @{ name = 'Cabos';         slug = 'cabos';         description = 'Cabos de carregamento e dados.' }
  @{ name = 'Armazenamento'; slug = 'armazenamento'; description = 'Cartões de memória e armazenamento removível.' }
  @{ name = 'Rastreamento';  slug = 'rastreamento';  description = 'Tags e rastreadores de localização.' }
  @{ name = 'Audio';         slug = 'audio';         description = 'Caixas de som e microfones.' }
  @{ name = 'Suportes';      slug = 'suportes';      description = 'Suportes para celular.' }
  @{ name = 'Acessorios';    slug = 'acessorios';    description = 'Baterias portateis e outros acessorios.' }
)

foreach ($c in $categorias) {
  $body = $c | ConvertTo-Json -Compress
  try {
    $r = Invoke-RestMethod -Uri "$base/categories" -Method Post -Headers $headers -Body $body -ContentType 'application/json; charset=utf-8'
    Write-Output ("CREATED " + $r.slug + " -> " + $r.id)
  } catch {
    Write-Output ("EXISTS/ERROR " + $c.slug + " -> " + $_.Exception.Message)
  }
}
