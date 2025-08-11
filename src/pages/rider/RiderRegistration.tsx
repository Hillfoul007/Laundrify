import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Camera, Upload, User, Phone, FileText, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function RiderRegistration() {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    aadharNumber: ''
  });
  const [aadharImage, setAadharImage] = useState<File | null>(null);
  const [selfieImage, setSelfieImage] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleAadharUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size should be less than 5MB');
        return;
      }
      setAadharImage(file);
    }
  };

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user' } 
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setIsCameraOpen(true);
    } catch (err) {
      toast.error('Camera access denied or not available');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsCameraOpen(false);
  };

  const captureSelfie = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      const context = canvas.getContext('2d');
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      if (context) {
        context.drawImage(video, 0, 0);
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], 'selfie.jpg', { type: 'image/jpeg' });
            setSelfieImage(file);
            stopCamera();
            toast.success('Selfie captured successfully!');
          }
        }, 'image/jpeg', 0.8);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.phone || !formData.aadharNumber) {
      toast.error('Please fill all required fields');
      return;
    }
    
    if (!aadharImage) {
      toast.error('Please upload Aadhar card image');
      return;
    }
    
    if (!selfieImage) {
      toast.error('Please capture your selfie');
      return;
    }

    setIsSubmitting(true);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('name', formData.name);
      formDataToSend.append('phone', formData.phone);
      formDataToSend.append('aadharNumber', formData.aadharNumber);
      formDataToSend.append('aadharImage', aadharImage);
      formDataToSend.append('selfieImage', selfieImage);

      const response = await fetch('/api/riders/register', {
        method: 'POST',
        body: formDataToSend,
      });

      if (response.ok) {
        setIsSuccess(true);
        toast.success('Registration submitted successfully!');
      } else {
        const error = await response.json();
        toast.error(error.message || 'Registration failed');
      }
    } catch (error) {
      toast.error('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="text-center p-6">
        <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-green-700 mb-2">
          Registration Submitted!
        </h3>
        <p className="text-gray-600 mb-4">
          Thank you for registering. Our admin will verify your details and approve your account.
          You'll receive a notification once your account is approved.
        </p>
        <Button
          onClick={() => setIsSuccess(false)}
          variant="outline"
        >
          Register Another Rider
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Basic Information */}
        <div className="space-y-2">
          <Label htmlFor="name" className="flex items-center space-x-2">
            <User className="h-4 w-4" />
            <span>Full Name *</span>
          </Label>
          <Input
            id="name"
            name="name"
            type="text"
            placeholder="Enter your full name"
            value={formData.name}
            onChange={handleInputChange}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone" className="flex items-center space-x-2">
            <Phone className="h-4 w-4" />
            <span>Phone Number *</span>
          </Label>
          <Input
            id="phone"
            name="phone"
            type="tel"
            placeholder="Enter your phone number"
            value={formData.phone}
            onChange={handleInputChange}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="aadharNumber" className="flex items-center space-x-2">
            <FileText className="h-4 w-4" />
            <span>Aadhar Number *</span>
          </Label>
          <Input
            id="aadharNumber"
            name="aadharNumber"
            type="text"
            placeholder="Enter your 12-digit Aadhar number"
            value={formData.aadharNumber}
            onChange={handleInputChange}
            maxLength={12}
            required
          />
        </div>

        {/* Aadhar Upload */}
        <div className="space-y-2">
          <Label className="flex items-center space-x-2">
            <Upload className="h-4 w-4" />
            <span>Upload Aadhar Card *</span>
          </Label>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
            <input
              type="file"
              accept="image/*"
              onChange={handleAadharUpload}
              className="hidden"
              id="aadhar-upload"
            />
            <label htmlFor="aadhar-upload" className="cursor-pointer block text-center">
              {aadharImage ? (
                <div className="text-green-600">
                  <CheckCircle className="h-8 w-8 mx-auto mb-2" />
                  <p>{aadharImage.name}</p>
                </div>
              ) : (
                <div className="text-gray-500">
                  <Upload className="h-8 w-8 mx-auto mb-2" />
                  <p>Click to upload Aadhar card image</p>
                  <p className="text-sm">Max size: 5MB</p>
                </div>
              )}
            </label>
          </div>
        </div>

        {/* Selfie Capture */}
        <div className="space-y-2">
          <Label className="flex items-center space-x-2">
            <Camera className="h-4 w-4" />
            <span>Capture Live Selfie *</span>
          </Label>
          
          {!isCameraOpen && !selfieImage && (
            <Button
              type="button"
              onClick={startCamera}
              variant="outline"
              className="w-full"
            >
              <Camera className="h-4 w-4 mr-2" />
              Open Camera
            </Button>
          )}

          {isCameraOpen && (
            <div className="space-y-4">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full rounded-lg"
                style={{ maxHeight: '300px' }}
              />
              <div className="flex space-x-2">
                <Button
                  type="button"
                  onClick={captureSelfie}
                  className="flex-1"
                >
                  Capture Selfie
                </Button>
                <Button
                  type="button"
                  onClick={stopCamera}
                  variant="outline"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {selfieImage && (
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <p className="text-green-700">Selfie captured successfully!</p>
              <Button
                type="button"
                onClick={() => {
                  setSelfieImage(null);
                  startCamera();
                }}
                variant="outline"
                size="sm"
                className="mt-2"
              >
                Retake Selfie
              </Button>
            </div>
          )}
        </div>

        <canvas ref={canvasRef} className="hidden" />

        <Button
          type="submit"
          className="w-full"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Submitting...' : 'Submit Registration'}
        </Button>
      </form>
    </div>
  );
}
