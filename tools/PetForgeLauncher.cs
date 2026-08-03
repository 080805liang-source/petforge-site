using System;
using System.Diagnostics;
using System.IO;
using System.Reflection;
using System.Text;
using System.Windows.Forms;

internal static class PetForgeLauncher
{
    private static readonly byte[] FooterMagic = Encoding.ASCII.GetBytes("PFG1TAIL");

    [STAThread]
    private static void Main()
    {
        try
        {
            var sourcePath = Assembly.GetExecutingAssembly().Location;
            var appName = SafeName(Path.GetFileNameWithoutExtension(sourcePath));
            var appRoot = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "PetForge", appName);
            Directory.CreateDirectory(appRoot);

            var portablePath = Path.Combine(appRoot, appName + ".exe");
            if (!string.Equals(Path.GetFullPath(sourcePath), Path.GetFullPath(portablePath), StringComparison.OrdinalIgnoreCase))
            {
                File.Copy(sourcePath, portablePath, true);
            }

            ExtractBundle(sourcePath, appRoot);
            CreateDesktopShortcut(portablePath, appRoot, appName);

            var petApp = Path.Combine(appRoot, "PetForge.exe");
            if (!File.Exists(petApp)) throw new InvalidDataException("桌宠主程序未能释放。");
            Process.Start(new ProcessStartInfo(petApp) { WorkingDirectory = appRoot, UseShellExecute = true });
        }
        catch (Exception error)
        {
            File.WriteAllText(Path.Combine(Path.GetTempPath(), "PetForgeLauncher-error.txt"), error.ToString());
            MessageBox.Show("桌宠启动失败：" + error.Message + "\r\n\r\n请重新下载生成的软件后再试。", "PET FORGE", MessageBoxButtons.OK, MessageBoxIcon.Error);
        }
    }

    private static void ExtractBundle(string sourcePath, string appRoot)
    {
        var bytes = File.ReadAllBytes(sourcePath);
        if (bytes.Length < 12) throw new InvalidDataException("这不是 PET FORGE 生成的软件。");
        var footer = bytes.Length - 12;
        for (var i = 0; i < FooterMagic.Length; i++)
        {
            if (bytes[footer + 4 + i] != FooterMagic[i]) throw new InvalidDataException("软件数据不完整，请重新下载。");
        }

        var payloadLength = BitConverter.ToUInt32(bytes, footer);
        var payloadOffset = footer - (int)payloadLength;
        if (payloadOffset < 0 || payloadLength < 8) throw new InvalidDataException("软件数据不完整，请重新下载。");

        using (var stream = new MemoryStream(bytes, payloadOffset, (int)payloadLength, false))
        using (var reader = new BinaryReader(stream, Encoding.UTF8))
        {
            if (Encoding.ASCII.GetString(reader.ReadBytes(4)) != "PFG1") throw new InvalidDataException("软件数据格式错误。");
            var count = reader.ReadUInt32();
            if (count == 0 || count > 8) throw new InvalidDataException("软件数据格式错误。");

            for (var item = 0; item < count; item++)
            {
                var nameLength = reader.ReadUInt16();
                var name = Encoding.UTF8.GetString(reader.ReadBytes(nameLength));
                var dataLength = reader.ReadUInt32();
                if (!IsSafeBundleName(name) || dataLength > stream.Length - stream.Position) throw new InvalidDataException("软件数据格式错误。");
                var target = Path.Combine(appRoot, name.Replace('/', Path.DirectorySeparatorChar));
                Directory.CreateDirectory(Path.GetDirectoryName(target));
                File.WriteAllBytes(target, reader.ReadBytes((int)dataLength));
            }
        }
    }

    private static bool IsSafeBundleName(string name)
    {
        return name == "PetForge.exe" || name == "config.json" || name == "assets/pet.png";
    }

    private static string SafeName(string value)
    {
        foreach (var character in Path.GetInvalidFileNameChars()) value = value.Replace(character, '-');
        return string.IsNullOrWhiteSpace(value) ? "我的桌宠" : value;
    }

    private static void CreateDesktopShortcut(string targetPath, string workingDirectory, string label)
    {
        var shellType = Type.GetTypeFromProgID("WScript.Shell");
        if (shellType == null) return;
        dynamic shell = Activator.CreateInstance(shellType);
        var desktop = Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory);
        dynamic shortcut = shell.CreateShortcut(Path.Combine(desktop, label + ".lnk"));
        shortcut.TargetPath = targetPath;
        shortcut.WorkingDirectory = workingDirectory;
        shortcut.IconLocation = targetPath;
        shortcut.Description = "PET FORGE 桌宠";
        shortcut.Save();
    }
}
