$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$root = 'C:\Datos\Trabajo'
$form = New-Object System.Windows.Forms.Form
$form.Text = 'Buscar proyecto · C:\Datos\Trabajo'
$form.StartPosition = 'CenterScreen'
$form.Size = New-Object System.Drawing.Size(780, 520)
$form.MinimumSize = New-Object System.Drawing.Size(620, 420)
$form.Font = New-Object System.Drawing.Font('Segoe UI', 10)

$title = New-Object System.Windows.Forms.Label
$title.Text = 'Proyectos disponibles'
$title.Font = New-Object System.Drawing.Font('Segoe UI Semibold', 16)
$title.AutoSize = $true
$title.Location = New-Object System.Drawing.Point(20, 16)
$form.Controls.Add($title)

$search = New-Object System.Windows.Forms.TextBox
$search.Location = New-Object System.Drawing.Point(20, 58)
$search.Size = New-Object System.Drawing.Size(720, 30)
$form.Controls.Add($search)

$list = New-Object System.Windows.Forms.ListView
$list.View = 'Details'
$list.FullRowSelect = $true
$list.GridLines = $true
$list.HideSelection = $false
$list.Location = New-Object System.Drawing.Point(20, 102)
$list.Size = New-Object System.Drawing.Size(720, 300)
[void]$list.Columns.Add('Proyecto', 260)
[void]$list.Columns.Add('Ubicación', 430)
$form.Controls.Add($list)

$hint = New-Object System.Windows.Forms.Label
$hint.Text = 'Doble clic para abrir la carpeta del proyecto.'
$hint.AutoSize = $true
$hint.ForeColor = [System.Drawing.Color]::DimGray
$hint.Location = New-Object System.Drawing.Point(20, 414)
$form.Controls.Add($hint)

$open = New-Object System.Windows.Forms.Button
$open.Text = 'Abrir carpeta'
$open.Location = New-Object System.Drawing.Point(540, 438)
$open.Size = New-Object System.Drawing.Size(120, 32)
$form.Controls.Add($open)
$close = New-Object System.Windows.Forms.Button
$close.Text = 'Cerrar'
$close.Location = New-Object System.Drawing.Point(670, 438)
$close.Size = New-Object System.Drawing.Size(70, 32)
$form.Controls.Add($close)

$projects = @()
function Load-Projects {
    $script:projects = @(Get-ChildItem -LiteralPath $root -Directory -Force | Sort-Object Name | ForEach-Object {
        [pscustomobject]@{ Name = $_.Name; FullName = $_.FullName }
    })
}
function Render-Projects {
    $list.BeginUpdate()
    $list.Items.Clear()
    $term = $search.Text.Trim().ToLowerInvariant()
    foreach ($project in $projects | Where-Object { -not $term -or $_.Name.ToLowerInvariant().Contains($term) -or $_.FullName.ToLowerInvariant().Contains($term) }) {
        $item = New-Object System.Windows.Forms.ListViewItem($project.Name)
        [void]$item.SubItems.Add($project.FullName)
        $item.Tag = $project.FullName
        [void]$list.Items.Add($item)
    }
    $list.EndUpdate()
}
function Open-Selected {
    if ($list.SelectedItems.Count -gt 0) { Invoke-Item -LiteralPath $list.SelectedItems[0].Tag }
}
Load-Projects
Render-Projects
$search.Add_TextChanged({ Render-Projects })
$list.Add_DoubleClick({ Open-Selected })
$open.Add_Click({ Open-Selected })
$close.Add_Click({ $form.Close() })
$form.Add_Shown({ $search.Focus() })
[void]$form.ShowDialog()
