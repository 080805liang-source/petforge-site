using System;
using System.Diagnostics;
using System.IO;
using System.Windows.Forms;

internal static class PetForgeLauncher
{
    [STAThread]
    private static void Main()
    {
        string root = AppDomain.CurrentDomain.BaseDirectory;
        string runtime = Path.Combine(root, "_internal", "pythonw.exe");
        string script = Path.Combine(root, "desktop_app.py");
        if (!File.Exists(runtime) || !File.Exists(script) || !File.Exists(Path.Combine(root, "config.json")))
        {
            MessageBox.Show("请先解压整个 ZIP，再打开 PetForge.exe。请保留 _internal、assets 和其他文件。", "PET FORGE");
            return;
        }
        try
        {
            Process.Start(new ProcessStartInfo(runtime, "\"" + script + "\"")
            {
                WorkingDirectory = root,
                UseShellExecute = false,
                CreateNoWindow = true
            });
        }
        catch (Exception error)
        {
            MessageBox.Show("启动失败：" + error.Message, "PET FORGE");
        }
    }
}
