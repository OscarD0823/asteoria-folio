param([string]$SigningDirectory = (Join-Path $PSScriptRoot '..\..\.prisma-signing'))
$ErrorActionPreference='Stop'
$prismaRoot=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$prismaKeys=[IO.Path]::GetFullPath($SigningDirectory)
New-Item -ItemType Directory -Path $prismaKeys -Force | Out-Null
$prismaKey=Join-Path $prismaKeys 'Prisma-PDF-release.p12'
$prismaPasswordFile=Join-Path $prismaKeys 'password.dpapi'
if (-not (Test-Path -LiteralPath $prismaPasswordFile)) {
  $prismaRandom=New-Object byte[] 32
  $prismaGenerator=[Security.Cryptography.RandomNumberGenerator]::Create()
  $prismaGenerator.GetBytes($prismaRandom)
  $prismaGenerator.Dispose()
  $prismaSecret=[Convert]::ToBase64String($prismaRandom) | ConvertTo-SecureString -AsPlainText -Force
  $prismaSecret | ConvertFrom-SecureString | Set-Content -LiteralPath $prismaPasswordFile
}
$prismaSecret=Get-Content -LiteralPath $prismaPasswordFile | ConvertTo-SecureString
$env:PRISMA_KEY_PASSWORD=[Net.NetworkCredential]::new('', $prismaSecret).Password
$env:PRISMA_KEYSTORE_FILE=$prismaKey
try {
  if (-not (Test-Path -LiteralPath $prismaKey)) {
    & (Join-Path $env:JAVA_HOME 'bin\keytool.exe') -genkeypair -keystore $prismaKey -storetype PKCS12 -alias prisma-pdf -keyalg RSA -keysize 3072 -validity 36500 -dname 'CN=Prisma PDF, O=OscarD0823, C=CO' -storepass:env PRISMA_KEY_PASSWORD -keypass:env PRISMA_KEY_PASSWORD
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo crear la clave de firma' }
  }
  Push-Location (Join-Path $prismaRoot 'android')
  try { & .\gradlew.bat assembleRelease --no-daemon; if ($LASTEXITCODE -ne 0) { throw 'Error de compilación de Android' } } finally { Pop-Location }
} finally { Remove-Item Env:PRISMA_KEY_PASSWORD -ErrorAction SilentlyContinue; Remove-Item Env:PRISMA_KEYSTORE_FILE -ErrorAction SilentlyContinue }
