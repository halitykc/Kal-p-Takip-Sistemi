Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

' Get script directory
scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)

' Check if server is already running
On Error Resume Next
Set http = CreateObject("MSXML2.XMLHTTP")
http.Open "GET", "http://localhost:3000/api/auth/me", False
http.Send
If http.Status = 200 Or http.Status = 401 Then
    ' Server already running, just open browser
    WshShell.Run "http://localhost:3000", 1, False
    WScript.Quit
End If
On Error GoTo 0

' Find node.exe from PATH
nodePath = ""
On Error Resume Next
Set exec = WshShell.Exec("where node")
nodePath = Trim(exec.StdOut.ReadLine)
On Error GoTo 0

If nodePath = "" Then
    ' Fallback to common installation paths
    If fso.FileExists("C:\Program Files\nodejs\node.exe") Then
        nodePath = "C:\Program Files\nodejs\node.exe"
    ElseIf fso.FileExists("C:\Program Files (x86)\nodejs\node.exe") Then
        nodePath = "C:\Program Files (x86)\nodejs\node.exe"
    Else
        MsgBox "Node.js bulunamadı! Lütfen https://nodejs.org adresinden yükleyin.", vbCritical, "Kalıp Takip Sistemi"
        WScript.Quit
    End If
End If

' Start server hidden
WshShell.CurrentDirectory = scriptDir
WshShell.Run """" & nodePath & """ """ & scriptDir & "\server.js""", 0, False

' Wait for server to start
WScript.Sleep 3000

' Open browser
WshShell.Run "http://localhost:3000", 1, False
